"use client";

import CustomContainer from "@/components/CustomContainer";
import CustomInput from "@/components/CustomInput";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomFileUploader from "@/components/CustomInput/CustomFileUploader";
import {
  Button,
  Flex,
  Text,
  Box,
  Badge,
  VStack,
  HStack,
  IconButton,
  Table,
} from "@chakra-ui/react";
import { Tooltip } from "@/components/ui/tooltip";
import { MdCallSplit, MdAdd, MdDeleteOutline } from "react-icons/md";
import { FieldArray, Formik } from "formik";
import * as Yup from "yup";
import { use, useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  bulkCreateStickeringEntries,
  deleteStickeringEntry,
  updateStickeringEntry,
} from "@/api/helpers/stickering";
import useProducts from "@/api/customHooks/useProducts";
import useEmployee from "@/api/customHooks/useEmployee";
import useStickeringById from "@/api/customHooks/useStickeringById";
import usePurchaseAcknowledgments from "@/api/customHooks/usePurchaseAcknowledgments";
import { capitalizeWords } from "@/utils/string";
import {
  PurchaseAcknowledgmentOptionRenderer,
  createPurchaseAcknowledgmentOptions,
} from "@/components/PurchaseAcknowledgment";
import useWMSPurchaseEntries from "@/api/customHooks/useWMSPurchaseEntries";
import { MATERIAL_TYPES } from "@/constants/materialTypes";
import useMaterials from "@/api/customHooks/useMaterials";

/** Coerce Formik / dropdown value to a string code for the API, or `null` when empty. */
function normalizeStickeringEmployeeCode(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "object" && raw !== null && "value" in raw) {
    const v = raw.value;
    if (v === null || v === undefined || v === "") return null;
    return String(v);
  }
  return String(raw);
}

function getSplitAllocatedQty(items, groupId) {
  return (items || []).reduce((sum, row) => {
    if (row.is_split_child && row.split_group_id === groupId) {
      return sum + (parseFloat(row.qty) || 0);
    }
    return sum;
  }, 0);
}

/** Map API stickering employee to searchable-dropdown value (`employee_code`). */
function resolveStickeringEmployeeSelectValue(stickering, employees) {
  if (!stickering) return null;
  const list = employees || [];
  if (stickering.employee_code != null && stickering.employee_code !== "") {
    return String(stickering.employee_code);
  }
  const id = stickering.employee_id;
  if (id == null || id === "") return null;
  const match = list.find((e) => String(e.employee_id) === String(id));
  return match?.employee_code != null ? String(match.employee_code) : null;
}

/** Searchable-dropdown row for item `employee_code` (image + name + code). */
function StickeringEmployeeOptionRenderer(item) {
  if (!item) {
    return (
      <Text fontSize="sm" color="gray.500">
        —
      </Text>
    );
  }
  const name = item.employee_name
    ? capitalizeWords(item.employee_name)
    : String(item.label ?? "").split(" (")[0] || "—";
  const code = item.employee_code ?? item.value ?? "—";
  const imgUrl = item.profile_img_url;

  return (
    <Flex align="center" gap={3} w="100%" py={0.5} textAlign="left">
      <Box
        flexShrink={0}
        w="56px"
        h="56px"
        borderRadius="md"
        overflow="hidden"
        bg="gray.100"
        borderWidth="1px"
        borderColor="gray.200"
      >
        {imgUrl ? (
          <Box
            as="img"
            src={imgUrl}
            alt=""
            w="100%"
            h="100%"
            objectFit="cover"
            loading="lazy"
          />
        ) : (
          <Flex
            w="100%"
            h="100%"
            align="center"
            justify="center"
            fontSize="xs"
            fontWeight="semibold"
            color="gray.500"
          >
            {String(name).slice(0, 2).toUpperCase()}
          </Flex>
        )}
      </Box>
      <Flex direction="column" align="flex-start" minW={0} flex={1}>
        <Text fontSize="sm" fontWeight="medium" lineClamp={1}>
          {name}
        </Text>
        <Text fontSize="xs" color="gray.600" lineClamp={1}>
          Code: {code}
        </Text>
      </Flex>
    </Flex>
  );
}

function buildStickeringItemsRenderPlan(items) {
  const list = items || [];
  const plan = [];
  const skip = new Set();
  for (let i = 0; i < list.length; i++) {
    if (skip.has(i)) continue;
    const row = list[i];
    if (row.is_split_parent) {
      const gid = row.split_group_id;
      const childIndices = [];
      for (let j = i + 1; j < list.length; j++) {
        const c = list[j];
        if (c.is_split_child && c.split_group_id === gid) {
          childIndices.push(j);
          skip.add(j);
        }
      }
      skip.add(i);
      plan.push({ kind: "split", parentIdx: i, childIndices });
    } else if (!row.is_split_child) {
      plan.push({ kind: "single", idx: i });
    }
  }
  return plan;
}

/** Group consecutive single rows so one table / mobile stack can cover each run. */
function chunkStickeringItemPlan(plan) {
  const chunks = [];
  let curSingles = [];
  for (const e of plan) {
    if (e.kind === "single") {
      curSingles.push(e);
    } else {
      if (curSingles.length) {
        chunks.push({ kind: "singles", entries: [...curSingles] });
        curSingles = [];
      }
      chunks.push(e);
    }
  }
  if (curSingles.length) {
    chunks.push({ kind: "singles", entries: curSingles });
  }
  return chunks;
}

function syncSplitGroupSharedFields(setFieldValue, items, groupId, patch) {
  (items || []).forEach((row, idx) => {
    if (row.is_split_child && row.split_group_id === groupId) {
      Object.entries(patch).forEach(([key, val]) => {
        setFieldValue(`items.${idx}.${key}`, val);
      });
    }
  });
}

const VALIDATION_SCHEMA = Yup.object({
  purchase_acknowledgment_id: Yup.number()
    .transform((value, originalValue) => {
      // Handle empty string or null from dropdown
      if (
        originalValue === "" ||
        originalValue === null ||
        originalValue === undefined
      ) {
        return undefined;
      }
      return Number(originalValue);
    })
    .required("Required")
    .integer("Must be an integer")
    .positive("Must be positive"),
  supervisor_id: Yup.string().required("Required"),
  items: Yup.array()
    .of(
      Yup.object({
        product_id: Yup.mixed().required("Required"),
        qty: Yup.mixed().test(
          "qty",
          "Must be greater than 0",
          function (value) {
            const row = this.parent;
            const n = parseFloat(value);
            if (row?.is_split_auto_balance) {
              return !Number.isNaN(n) && n >= 0;
            }
            if (row?.is_split_parent || row?.is_split_child) {
              return !Number.isNaN(n) && n >= 0.01;
            }
            return !Number.isNaN(n) && n >= 0.01;
          }
        ),
        material_type: Yup.string().nullable().optional(),
        employee_code: Yup.mixed().nullable().optional(),
      })
    )
    .min(1, "At least one item is required!"),
});

const INITIAL_VALUES = {
  items: [],
  purchase_acknowledgment_id: "",
  supervisor_id: "",
};

function createSplitChildRow(parent, splitGroupId, overrides = {}) {
  return {
    product_id: parent.product_id,
    product_code: parent.product_code,
    product_name: parent.product_name,
    qty: "",
    material_type: parent.material_type,
    employee_code: null,
    status: parent.status || "open",
    packing: parent.packing ?? null,
    loose: parent.loose ?? null,
    pur_ret: parent.pur_ret ?? null,
    wastage: parent.wastage ?? null,
    sticker_type_1: parent.sticker_type_1 ?? null,
    sticker_type_2: parent.sticker_type_2 ?? null,
    is_new_product: parent.is_new_product || false,
    split_group_id: splitGroupId,
    is_split_parent: false,
    is_split_child: true,
    split_original_qty: null,
    split_source_entry_id: null,
    is_split_auto_balance: false,
    is_split_manual: true,
    ...overrides,
  };
}

export default function StickeringForm({ params }) {
  const router = useRouter();
  const { mode } = use(params);
  const stickeringId = mode[1];
  const [initialValues, setInitialValues] = useState(INITIAL_VALUES);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [productMap, setProductMap] = useState({});
  const [productsLoading, setProductsLoading] = useState(false);

  const { stickering, loading: stickeringLoading } =
    useStickeringById(stickeringId);
  const { products, loading: productsApiLoading } = useProducts();
  const { employees } = useEmployee({ allBranches: true });
  const { purchaseAcknowledgments } = usePurchaseAcknowledgments();

  const { wmsPurchaseEntries } = useWMSPurchaseEntries();
  const [selectedPurchaseAckId, setSelectedPurchaseAckId] = useState(null);
  const [pendingItemsLoad, setPendingItemsLoad] = useState(null);
  const itemsLoadRef = useRef(null);
  const setFieldValueRef = useRef(null);
  const splitAutoBalanceDebounceRef = useRef({});
  const splitAutoBalancePendingRef = useRef({});
  const { materials } = useMaterials();
  const materialsOptions = materials
    .filter((material) => material.material_category_id === 1)
    .map((material) => ({
      value: material.material_id,
      label: material.name,
    }));

  // Find WMS purchase entry by purchase_acknowledgment_id
  const wmsPurchaseEntry = useMemo(() => {
    if (!selectedPurchaseAckId || !wmsPurchaseEntries.length) return null;
    return wmsPurchaseEntries.find(
      (entry) => entry.purchase_acknowledgment_id === selectedPurchaseAckId
    );
  }, [selectedPurchaseAckId, wmsPurchaseEntries]);

  const isCreateMode = mode[0] === "create";
  const isViewMode = mode[0] === "view";
  const isEditMode = mode[0] === "edit";

  const validateSplitRows = useCallback(
    (values) => {
      const err = {};
      if (!isEditMode) return err;
      const items = values.items || [];
      const parent = items.find((i) => i.is_split_parent);
      if (!parent) return err;
      const gid = parent.split_group_id;
      const children = items.filter(
        (i) => i.is_split_child && i.split_group_id === gid
      );
      if (children.length === 0) {
        err._splitRows = "Add a line.";
        return err;
      }
      const manualChildren = children.filter((c) => !c.is_split_auto_balance);
      if (manualChildren.length === 0) {
        err._splitRows = "Add at least one split line.";
        return err;
      }

      let manualSum = 0;
      for (const c of manualChildren) {
        const q = parseFloat(c.qty) || 0;
        if (q < 0.01) {
          err._splitRows = "Each split row needs a quantity.";
          return err;
        }
        manualSum += q;
      }
      const target = parseFloat(parent.split_original_qty);
      if (Number.isFinite(target)) {
        const remaining =
          Math.round((target - manualSum + Number.EPSILON) * 100) / 100;
        if (remaining < -0.0001) {
          err._splitRows = "Split qty exceeds total.";
          return err;
        }
      }
      return err;
    },
    [isEditMode]
  );

  // Create a map of products by product_id for quick lookup
  useEffect(() => {
    if (products && products.length > 0) {
      const map = {};
      products.forEach((product) => {
        // Map by product_id (assuming code in xlsx is product_id)
        const productId = product.product_id;
        map[productId] = product;
        map[String(productId)] = product;
        // Also map by product_code if it exists
        if (product.product_code) {
          map[product.product_code] = product;
          map[String(product.product_code)] = product;
        }
      });
      setProductMap(map);
    }
  }, [products]);

  useEffect(() => {
    return () => {
      Object.values(splitAutoBalanceDebounceRef.current).forEach((timerId) => {
        if (timerId) clearTimeout(timerId);
      });
      splitAutoBalanceDebounceRef.current = {};
      splitAutoBalancePendingRef.current = {};
    };
  }, []);

  // Load existing stickering data for edit/view mode
  // Note: Backend returns a single record, but form expects an array
  useEffect(() => {
    if (stickering && (isEditMode || isViewMode)) {
      // Backend returns a single record structure, wrap it in an array for the form
      const item = {
        product_id: stickering.product_id,
        product_code: stickering.product_id?.toString(),
        product_name: stickering.product_name || "",
        qty: stickering.qty,
        material_type: stickering.material_type || "",
        employee_code: resolveStickeringEmployeeSelectValue(
          stickering,
          employees
        ),
        status: stickering.status || "open",
        packing: stickering.packing ?? null,
        loose: stickering.loose ?? null,
        pur_ret: stickering.pur_ret ?? null,
        wastage: stickering.wastage ?? null,
        sticker_type_1: stickering.sticker_type_1 ?? null,
        sticker_type_2: stickering.sticker_type_2 ?? null,
        split_group_id: null,
        is_split_parent: false,
        is_split_child: false,
        split_original_qty: null,
        split_source_entry_id: null,
        is_split_auto_balance: false,
        is_split_manual: false,
      };
      setInitialValues({
        items: [item],
        purchase_acknowledgment_id: stickering.purchase_acknowledgment_id || "",
        supervisor_id: stickering.supervisor_id || "",
      });
    }
  }, [stickering, isEditMode, isViewMode, employees]);

  // Load items from WMS purchase entry when it's available in create mode
  useEffect(() => {
    if (
      isCreateMode &&
      wmsPurchaseEntry &&
      wmsPurchaseEntry.items &&
      wmsPurchaseEntry.items.length > 0 &&
      parsedData.length === 0 &&
      !uploadedFile
    ) {
      // Transform WMS purchase entry items to stickering format
      const itemsForStickering = wmsPurchaseEntry.items.map((item) => {
        const quantity = parseFloat(item.quantity) || 0;
        const productId = item.product_id;
        const productName =
          item.product_name || item.product?.product_name || "";

        return {
          product_id: productId,
          product_code: productId?.toString(),
          product_name: productName,
          qty: quantity,
          material_type: null,
          employee_code: null,
          is_new_product: item.is_new_product || false,
          split_group_id: null,
          is_split_parent: false,
          is_split_child: false,
          split_original_qty: null,
          split_source_entry_id: null,
          is_split_auto_balance: false,
          is_split_manual: false,
        };
      });

      setParsedData(itemsForStickering);
      // Store items to be loaded into form via setFieldValue
      setPendingItemsLoad(itemsForStickering);
    }
  }, [isCreateMode, wmsPurchaseEntry, parsedData.length, uploadedFile]);

  // Load items from pendingItemsLoad into the form when ready
  useEffect(() => {
    if (
      pendingItemsLoad &&
      isCreateMode &&
      setFieldValueRef.current &&
      itemsLoadRef.current !== selectedPurchaseAckId
    ) {
      setFieldValueRef.current("items", pendingItemsLoad);
      itemsLoadRef.current = selectedPurchaseAckId;
      setPendingItemsLoad(null);
    }
  }, [pendingItemsLoad, isCreateMode, selectedPurchaseAckId]);

  const getTitle = () => {
    if (isCreateMode) {
      return "Create Job Sheet";
    }
    if (isEditMode) {
      return "Edit Job Sheet";
    }
    return `Job Sheet : #${stickeringId ?? ""}`;
  };

  const handleSubmit = async (values) => {
    try {
      if (isCreateMode) {
        // Transform items to match backend expected format for bulk create
        // Each item should have: product_id, qty, employee_code, purchase_acknowledgment_id, supervisor_id, and optional status
        const submitData = values.items.map((item) => {
          const employee_code = normalizeStickeringEmployeeCode(
            item.employee_code
          );
          return {
            product_id: item.product_id,
            qty: parseFloat(item.qty),
            material_type: item.material_type || null,
            employee_code,
            purchase_acknowledgment_id: values.purchase_acknowledgment_id,
            supervisor_id: values.supervisor_id || null,
            status: item.status || "open",
            is_new_product: item.is_new_product || false,
            product_name: item.product_name || "",
            sticker_type_1: item.sticker_type_1 || null,
            sticker_type_2: item.sticker_type_2 || null,
          };
        });

        toast.promise(bulkCreateStickeringEntries(submitData), {
          loading: "Creating job sheet entries...",
          success: (response) => {
            if (response.code === 200 || response.code === 201) {
              // router.push("/stickering");
              router.back();
              return `Successfully created ${submitData.length} job sheet ${
                submitData.length === 1 ? "entry" : "entries"
              }!`;
            } else {
              throw new Error(
                response.message ||
                  response.msg ||
                  "Failed to create job sheet entries"
              );
            }
          },
          error: (err) => {
            console.error(err);
            return (
              err.message || err.msg || "Error creating job sheet entries!"
            );
          },
        });
      } else if (isEditMode) {
        const splitParent = values.items.find((i) => i.is_split_parent);
        if (splitParent) {
          const gid = splitParent.split_group_id;
          const children = values.items.filter(
            (i) => i.is_split_child && i.split_group_id === gid
          );
          const entryIdToDelete =
            splitParent.split_source_entry_id ?? stickeringId;
          if (!children.length) {
            toast.error("Add a line.");
            return;
          }
          const target = parseFloat(splitParent.split_original_qty);
          const manualChildren = children.filter(
            (c) => !c.is_split_auto_balance
          );
          const manualSum = manualChildren.reduce(
            (sum, c) => sum + (parseFloat(c.qty) || 0),
            0
          );
          if (!Number.isFinite(target)) {
            toast.error("Invalid split total.");
            return;
          }
          const remaining = target - manualSum;
          if (remaining < -0.0001) {
            toast.error("Split qty exceeds total.");
            return;
          }
          for (const c of manualChildren) {
            if (parseFloat(c.qty) < 0.01) {
              toast.error("Each split row needs a quantity.");
              return;
            }
          }

          const autoLine = children.find((c) => c.is_split_auto_balance);
          const effectiveChildren = manualChildren.map((item) => ({
            ...item,
            qty: parseFloat(item.qty) || 0,
          }));
          if (remaining >= 0.01) {
            if (autoLine) {
              effectiveChildren.push({
                ...autoLine,
                qty: Math.round((remaining + Number.EPSILON) * 100) / 100,
              });
            } else {
              effectiveChildren.push({
                ...createSplitChildRow(splitParent, gid, {
                  is_split_auto_balance: true,
                  is_split_manual: false,
                }),
                qty: Math.round((remaining + Number.EPSILON) * 100) / 100,
              });
            }
          }
          const submitData = effectiveChildren.map((item) => ({
            product_id: item.product_id,
            qty: parseFloat(item.qty),
            material_type: splitParent.material_type || null,
            employee_code: normalizeStickeringEmployeeCode(item.employee_code),
            purchase_acknowledgment_id: values.purchase_acknowledgment_id,
            supervisor_id: values.supervisor_id || null,
            status: splitParent.status || "open",
            is_new_product: splitParent.is_new_product || false,
            product_name: splitParent.product_name || "",
            sticker_type_1: splitParent.sticker_type_1 || null,
            sticker_type_2: splitParent.sticker_type_2 || null,
          }));

          toast.promise(
            (async () => {
              const response = await bulkCreateStickeringEntries(submitData);
              if (response.code !== 200 && response.code !== 201) {
                throw new Error(
                  response.message ||
                    response.msg ||
                    "Failed to create split entries"
                );
              }
              await deleteStickeringEntry(entryIdToDelete);
              return response;
            })(),
            {
              loading: "Saving split job sheet…",
              success: () => {
                router.back();
                return `Replaced entry with ${submitData.length} split line(s).`;
              },
              error: (err) =>
                err?.message || err?.msg || "Could not save split job sheet.",
            }
          );
          return;
        }

        // For edit mode, update a single record (first item in array)
        // Backend expects a single object with optional fields: product_id, qty, employee_code, status
        const firstItem = values.items[0];
        if (!firstItem) {
          toast.error("No item to update");
          return;
        }

        const updateData = {};
        if (firstItem.product_id) updateData.product_id = firstItem.product_id;
        if (firstItem.qty !== undefined && firstItem.qty !== null) {
          updateData.qty = parseFloat(firstItem.qty);
        }
        if (firstItem.material_type)
          updateData.material_type = firstItem.material_type;
        updateData.employee_code = normalizeStickeringEmployeeCode(
          firstItem.employee_code
        );
        if (firstItem.status) updateData.status = firstItem.status;
        // purchase_acknowledgment_id is required
        if (values.purchase_acknowledgment_id) {
          updateData.purchase_acknowledgment_id =
            values.purchase_acknowledgment_id;
        }
        if (values.supervisor_id) {
          updateData.supervisor_id = values.supervisor_id;
        }

        if (firstItem.sticker_type_1) {
          updateData.sticker_type_1 = firstItem.sticker_type_1;
        }

        if (firstItem.sticker_type_2) {
          updateData.sticker_type_2 = firstItem.sticker_type_2;
        }

        toast.promise(updateStickeringEntry(stickeringId, updateData), {
          loading: "Updating job sheet entry...",
          success: (response) => {
            if (response.code === 200) {
              // router.push("/stickering");
              router.back();
              return "Job sheet entry updated successfully!";
            } else {
              throw new Error(
                response.message ||
                  response.msg ||
                  "Failed to update job sheet entry"
              );
            }
          },
          error: (err) => {
            console.error(err);
            return err.message || err.msg || "Error updating job sheet entry!";
          },
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Error submitting job sheet entry!");
    }
  };

  const getPermissionKey = () => {
    if (isCreateMode || isEditMode) {
      return "add_stickering";
    }
    return "view_stickering";
  };

  const employeeOptions = useMemo(() => {
    if (!employees || employees.length === 0) return [];
    return employees.map((emp) => ({
      value: emp.employee_code,
      label: `${emp.employee_name} (${emp.employee_code})`,
      employee_name: emp.employee_name,
      employee_code: emp.employee_code,
      profile_img_url: emp.profile_img_url ?? null,
      searchText: [
        emp.employee_name,
        emp.employee_code,
        emp.designation_name,
        emp.branch_name,
      ]
        .filter(Boolean)
        .join(" "),
    }));
  }, [employees]);

  const supervisorOptions = useMemo(() => {
    if (!employees || employees.length === 0) return [];
    return (
      employees
        // .filter(
        //   (emp) =>
        //     !emp.terminated && emp.designation_id === SUPERVISOR_DESIGNATION_ID
        // )
        .map((emp) => ({
          value: emp.employee_code,
          label: `${emp.employee_code} - ${capitalizeWords(emp.employee_name)}`,
        }))
    );
  }, [employees]);

  const purchaseAcknowledgmentOptions = useMemo(() => {
    return createPurchaseAcknowledgmentOptions(
      purchaseAcknowledgments
      // purchaseAcknowledgments.filter((item) => {
      //   const jobSheetCreated =
      //     item.status_counts.open +
      //       item.status_counts.in_progress +
      //       item.status_counts.cancelled +
      //       item.status_counts.done !==
      //     0;

      //   return (
      //     (isCreateMode &&
      //       item.purchase_entry_id !== null &&
      //       !jobSheetCreated &&
      //       item.is_job_entry_needed) ||
      //     isEditMode ||
      //     isViewMode
      //   );
      // })
    );
  }, [purchaseAcknowledgments]);

  if (stickeringLoading && (isEditMode || isViewMode)) {
    return (
      <GlobalWrapper permissionKey={getPermissionKey()}>
        <CustomContainer title={getTitle()}>
          <Text>Loading...</Text>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper permissionKey={getPermissionKey()}>
      <CustomContainer title={getTitle()}>
        <Formik
          initialValues={initialValues}
          validationSchema={VALIDATION_SCHEMA}
          validate={validateSplitRows}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ handleSubmit, values, setFieldValue, errors }) => {
            // Store setFieldValue in ref for use outside render
            setFieldValueRef.current = setFieldValue;

            return (
              <Flex flexDirection="column" gap="22px">
                <Box>
                  <CustomInput
                    label="Purchase Acknowledgment"
                    placeholder="Select purchase acknowledgment..."
                    name="purchase_acknowledgment_id"
                    method="searchable-dropdown"
                    options={purchaseAcknowledgmentOptions}
                    customRender={PurchaseAcknowledgmentOptionRenderer}
                    isRequired
                    viewOnly={isViewMode}
                    onChange={(purchase_acknowledgment_id) => {
                      if (purchase_acknowledgment_id) {
                        setSelectedPurchaseAckId(
                          parseInt(purchase_acknowledgment_id)
                        );
                      } else {
                        setSelectedPurchaseAckId(null);
                        // Clear parsed data when purchase acknowledgment is cleared
                        if (
                          isCreateMode &&
                          parsedData.length > 0 &&
                          !uploadedFile
                        ) {
                          setParsedData([]);
                          setInitialValues((prev) => ({
                            ...prev,
                            items: [],
                          }));
                        }
                      }
                    }}
                  />
                </Box>

                <Box>
                  <CustomInput
                    label="Supervisor"
                    placeholder="Click here to select supervisor..."
                    name="supervisor_id"
                    method="searchable-dropdown"
                    options={supervisorOptions}
                    viewOnly={isViewMode}
                  />
                </Box>

                {/* Items */}
                {values.items && values.items.length > 0 && (
                  <CustomContainer title="Items" size="sm" color="secondary">
                    <FieldArray name="items">
                      {(arrayHelpers) => {
                        const getSplitMeta = (gid) => {
                          const indices = [];
                          let autoIdx = -1;
                          values.items.forEach((it, i) => {
                            if (
                              it.is_split_child &&
                              it.split_group_id === gid
                            ) {
                              indices.push(i);
                              if (it.is_split_auto_balance) autoIdx = i;
                            }
                          });
                          const parentIdx = values.items.findIndex(
                            (it) =>
                              it.is_split_parent && it.split_group_id === gid
                          );
                          const manualIndices = indices.filter(
                            (i) => !values.items[i].is_split_auto_balance
                          );
                          return { indices, autoIdx, parentIdx, manualIndices };
                        };

                        const recomputeSplitAutoLine = (gid) => {
                          const { parentIdx, autoIdx, manualIndices } =
                            getSplitMeta(gid);
                          if (parentIdx === -1) return;
                          const parent = values.items[parentIdx];
                          const target = parseFloat(parent.split_original_qty);
                          if (!Number.isFinite(target)) return;
                          const pending =
                            splitAutoBalancePendingRef.current[gid] ?? null;
                          const manualSum = manualIndices.reduce((sum, idx) => {
                            if (pending && pending.idx === idx) {
                              return sum + (parseFloat(pending.qty) || 0);
                            }
                            return (
                              sum + (parseFloat(values.items[idx]?.qty) || 0)
                            );
                          }, 0);
                          const remaining = target - manualSum;
                          const roundedRemaining =
                            Math.round((remaining + Number.EPSILON) * 100) /
                            100;

                          if (roundedRemaining <= 0) {
                            if (autoIdx !== -1) {
                              arrayHelpers.remove(autoIdx);
                            }
                            return;
                          }

                          if (autoIdx === -1) {
                            const insertAfter =
                              manualIndices.length > 0
                                ? manualIndices[manualIndices.length - 1]
                                : parentIdx;
                            arrayHelpers.insert(
                              insertAfter + 1,
                              createSplitChildRow(parent, gid, {
                                qty: roundedRemaining,
                                is_split_auto_balance: true,
                                is_split_manual: false,
                              })
                            );
                            return;
                          }
                          setFieldValue(
                            `items.${autoIdx}.qty`,
                            roundedRemaining
                          );
                        };

                        const scheduleRecomputeSplitAutoLine = (
                          gid,
                          pendingChange,
                          delayMs = 300
                        ) => {
                          if (pendingChange) {
                            splitAutoBalancePendingRef.current[gid] =
                              pendingChange;
                          }
                          const prevTimer =
                            splitAutoBalanceDebounceRef.current[gid];
                          if (prevTimer) clearTimeout(prevTimer);
                          splitAutoBalanceDebounceRef.current[gid] = setTimeout(
                            () => {
                              recomputeSplitAutoLine(gid);
                              delete splitAutoBalanceDebounceRef.current[gid];
                              delete splitAutoBalancePendingRef.current[gid];
                            },
                            delayMs
                          );
                        };

                        const runSplitAt = (idx) => {
                          const row = values.items[idx];
                          if (row.is_split_parent || row.is_split_child) return;
                          const gid =
                            typeof crypto !== "undefined" && crypto.randomUUID
                              ? crypto.randomUUID()
                              : `split-${Date.now()}`;
                          const originalQty = parseFloat(row.qty) || 0;
                          const parentUpdated = {
                            ...row,
                            is_split_parent: true,
                            is_split_child: false,
                            split_group_id: gid,
                            split_original_qty: originalQty,
                            split_source_entry_id: Number(stickeringId),
                            qty: originalQty,
                            is_split_auto_balance: false,
                            is_split_manual: false,
                          };
                          setFieldValue(`items.${idx}`, parentUpdated);
                          arrayHelpers.insert(
                            idx + 1,
                            createSplitChildRow(parentUpdated, gid, {
                              qty: "",
                              is_split_manual: true,
                            })
                          );
                          arrayHelpers.insert(
                            idx + 2,
                            createSplitChildRow(parentUpdated, gid, {
                              qty: originalQty,
                              is_split_auto_balance: true,
                              is_split_manual: false,
                            })
                          );
                        };
                        const runAddSplitChild = (parentIdx) => {
                          const parent = values.items[parentIdx];
                          if (!parent?.is_split_parent) return;
                          const gid = parent.split_group_id;
                          const { autoIdx, manualIndices } = getSplitMeta(gid);
                          const insertAt =
                            autoIdx !== -1
                              ? autoIdx
                              : manualIndices.length > 0
                              ? manualIndices[manualIndices.length - 1] + 1
                              : parentIdx + 1;
                          arrayHelpers.insert(
                            insertAt,
                            createSplitChildRow(parent, gid, {
                              qty: "",
                              is_split_manual: true,
                            })
                          );
                          setTimeout(() => recomputeSplitAutoLine(gid), 0);
                        };
                        return (
                          <VStack align="stretch" gap={4}>
                            {chunkStickeringItemPlan(
                              buildStickeringItemsRenderPlan(values.items)
                            ).map((chunk, chunkIdx) => {
                              if (chunk.kind === "singles") {
                                const showItemActionsCol =
                                  isEditMode ||
                                  (isCreateMode && values.items.length > 1);
                                return (
                                  <Box key={`chunk-singles-${chunkIdx}`}>
                                    <Box
                                      display={{ base: "none", md: "block" }}
                                    >
                                      <Table.Root
                                        variant="striped"
                                        sx={{
                                          "tbody tr:nth-of-type(odd) td": {
                                            background: "#f7f7f7",
                                          },
                                        }}
                                      >
                                        <Table.Header>
                                          <Table.Row>
                                            <Table.ColumnHeader>
                                              Code
                                            </Table.ColumnHeader>
                                            <Table.ColumnHeader>
                                              Item Name
                                            </Table.ColumnHeader>
                                            <Table.ColumnHeader>
                                              Quantity
                                            </Table.ColumnHeader>
                                            <Table.ColumnHeader>
                                              Material Type
                                            </Table.ColumnHeader>
                                            <Table.ColumnHeader>
                                              Sticker Type
                                            </Table.ColumnHeader>
                                            <Table.ColumnHeader>
                                              Employee
                                            </Table.ColumnHeader>
                                            {showItemActionsCol && (
                                              <Table.ColumnHeader w="88px">
                                                Actions
                                              </Table.ColumnHeader>
                                            )}
                                          </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                          {chunk.entries.map(({ idx }) => {
                                            const item = values.items[idx];
                                            const canRemoveLine =
                                              isCreateMode &&
                                              values.items.length > 1;
                                            return (
                                              <Table.Row
                                                key={`${item.product_id}-${idx}`}
                                              >
                                                <Table.Cell>
                                                  <Text fontSize="sm">
                                                    {item.product_code ||
                                                      item.product_id}
                                                  </Text>
                                                </Table.Cell>
                                                <Table.Cell>
                                                  <Flex
                                                    gap="8px"
                                                    align="center"
                                                  >
                                                    <Text>
                                                      {item.product_name}
                                                    </Text>
                                                    {item.is_new_product && (
                                                      <Badge
                                                        colorPalette="green"
                                                        size="xs"
                                                      >
                                                        New
                                                      </Badge>
                                                    )}
                                                  </Flex>
                                                </Table.Cell>
                                                <Table.Cell>
                                                  <CustomInput
                                                    name={`items.${idx}.qty`}
                                                    type="number"
                                                    min={0.01}
                                                    step={0.01}
                                                    placeholder="Quantity"
                                                    viewOnly={isViewMode}
                                                  />
                                                </Table.Cell>
                                                <Table.Cell>
                                                  <CustomInput
                                                    name={`items.${idx}.material_type`}
                                                    method="dropdown"
                                                    options={MATERIAL_TYPES}
                                                    placeholder="Select material type"
                                                    viewOnly={isViewMode}
                                                  />
                                                </Table.Cell>
                                                <Table.Cell>
                                                  <VStack
                                                    spacing="8px"
                                                    align="stretch"
                                                  >
                                                    <CustomInput
                                                      name={`items.${idx}.sticker_type_1`}
                                                      method="searchable-dropdown"
                                                      options={materialsOptions}
                                                      placeholder="Select sticker type..."
                                                      viewOnly={isViewMode}
                                                    />
                                                    {[
                                                      "double",
                                                      "looping",
                                                    ].includes(
                                                      item.material_type
                                                    ) && (
                                                      <CustomInput
                                                        name={`items.${idx}.sticker_type_2`}
                                                        method="searchable-dropdown"
                                                        options={
                                                          materialsOptions
                                                        }
                                                        placeholder="Select second sticker type..."
                                                        viewOnly={isViewMode}
                                                      />
                                                    )}
                                                  </VStack>
                                                </Table.Cell>
                                                <Table.Cell>
                                                  <CustomInput
                                                    name={`items.${idx}.employee_code`}
                                                    method="searchable-dropdown"
                                                    options={employeeOptions}
                                                    placeholder="Select employee..."
                                                    customRender={
                                                      StickeringEmployeeOptionRenderer
                                                    }
                                                    viewOnly={isViewMode}
                                                  />
                                                </Table.Cell>
                                                {showItemActionsCol && (
                                                  <Table.Cell>
                                                    <Flex
                                                      gap={1}
                                                      justify="center"
                                                    >
                                                      {isEditMode && (
                                                        <Tooltip content="Split this line into multiple assignees.">
                                                          <IconButton
                                                            aria-label="Split line"
                                                            size="sm"
                                                            variant="outline"
                                                            colorPalette="orange"
                                                            onClick={() =>
                                                              runSplitAt(idx)
                                                            }
                                                          >
                                                            <MdCallSplit
                                                              size={18}
                                                            />
                                                          </IconButton>
                                                        </Tooltip>
                                                      )}
                                                      {canRemoveLine && (
                                                        <Tooltip content="Remove this line.">
                                                          <IconButton
                                                            aria-label="Remove line"
                                                            size="sm"
                                                            variant="ghost"
                                                            colorPalette="red"
                                                            onClick={() =>
                                                              arrayHelpers.remove(
                                                                idx
                                                              )
                                                            }
                                                          >
                                                            <MdDeleteOutline
                                                              size={18}
                                                            />
                                                          </IconButton>
                                                        </Tooltip>
                                                      )}
                                                    </Flex>
                                                  </Table.Cell>
                                                )}
                                              </Table.Row>
                                            );
                                          })}
                                        </Table.Body>
                                      </Table.Root>
                                    </Box>
                                    <Box
                                      display={{ base: "block", md: "none" }}
                                    >
                                      <Flex flexDirection="column" gap="16px">
                                        {chunk.entries.map(({ idx }) => {
                                          const item = values.items[idx];
                                          const canRemoveLine =
                                            isCreateMode &&
                                            values.items.length > 1;
                                          return (
                                            <Box
                                              key={`m-${idx}`}
                                              p="16px"
                                              border="1px solid"
                                              borderColor="gray.200"
                                              borderRadius="md"
                                              bg="white"
                                            >
                                              <VStack
                                                spacing="12px"
                                                align="stretch"
                                              >
                                                {(isEditMode ||
                                                  canRemoveLine) && (
                                                  <Flex
                                                    justify="flex-end"
                                                    gap="1"
                                                  >
                                                    {isEditMode && (
                                                      <Tooltip content="Split this line into multiple assignees.">
                                                        <IconButton
                                                          aria-label="Split line"
                                                          size="sm"
                                                          variant="outline"
                                                          colorPalette="orange"
                                                          onClick={() =>
                                                            runSplitAt(idx)
                                                          }
                                                        >
                                                          <MdCallSplit
                                                            size={18}
                                                          />
                                                        </IconButton>
                                                      </Tooltip>
                                                    )}
                                                    {canRemoveLine && (
                                                      <Tooltip content="Remove this line.">
                                                        <IconButton
                                                          aria-label="Remove line"
                                                          size="sm"
                                                          variant="ghost"
                                                          colorPalette="red"
                                                          onClick={() =>
                                                            arrayHelpers.remove(
                                                              idx
                                                            )
                                                          }
                                                        >
                                                          <MdDeleteOutline
                                                            size={18}
                                                          />
                                                        </IconButton>
                                                      </Tooltip>
                                                    )}
                                                  </Flex>
                                                )}
                                                <Flex
                                                  direction="column"
                                                  gap="4px"
                                                  pb="12px"
                                                  borderBottom="1px solid"
                                                  borderColor="gray.100"
                                                >
                                                  <Text
                                                    fontSize="xs"
                                                    color="gray.600"
                                                    fontWeight="medium"
                                                  >
                                                    Code
                                                  </Text>
                                                  <Text
                                                    fontSize="sm"
                                                    fontWeight="medium"
                                                  >
                                                    {item.product_code ||
                                                      item.product_id}
                                                  </Text>
                                                </Flex>
                                                <Flex
                                                  direction="column"
                                                  gap="4px"
                                                  pb="12px"
                                                  borderBottom="1px solid"
                                                  borderColor="gray.100"
                                                >
                                                  <Text
                                                    fontSize="xs"
                                                    color="gray.600"
                                                    fontWeight="medium"
                                                  >
                                                    Item Name
                                                  </Text>
                                                  <Flex
                                                    gap="8px"
                                                    align="center"
                                                  >
                                                    <Text fontSize="sm">
                                                      {item.product_name}
                                                    </Text>
                                                    {item.is_new_product && (
                                                      <Badge
                                                        colorPalette="green"
                                                        size="xs"
                                                      >
                                                        New
                                                      </Badge>
                                                    )}
                                                  </Flex>
                                                </Flex>
                                                <Flex
                                                  direction="column"
                                                  gap="4px"
                                                  pb="12px"
                                                  borderBottom="1px solid"
                                                  borderColor="gray.100"
                                                >
                                                  <Text
                                                    fontSize="xs"
                                                    color="gray.600"
                                                    fontWeight="medium"
                                                  >
                                                    Quantity
                                                  </Text>
                                                  <CustomInput
                                                    name={`items.${idx}.qty`}
                                                    type="number"
                                                    min={0.01}
                                                    step={0.01}
                                                    placeholder="Quantity"
                                                    viewOnly={isViewMode}
                                                  />
                                                </Flex>
                                                <Flex
                                                  direction="column"
                                                  gap="4px"
                                                  pb="12px"
                                                  borderBottom="1px solid"
                                                  borderColor="gray.100"
                                                >
                                                  <Text
                                                    fontSize="xs"
                                                    color="gray.600"
                                                    fontWeight="medium"
                                                  >
                                                    Material Type
                                                  </Text>
                                                  <CustomInput
                                                    name={`items.${idx}.material_type`}
                                                    method="dropdown"
                                                    options={MATERIAL_TYPES}
                                                    placeholder="Select material type"
                                                    viewOnly={isViewMode}
                                                  />
                                                </Flex>
                                                <Flex
                                                  direction="column"
                                                  gap="4px"
                                                  pb="12px"
                                                  borderBottom="1px solid"
                                                  borderColor="gray.100"
                                                >
                                                  <Text
                                                    fontSize="xs"
                                                    color="gray.600"
                                                    fontWeight="medium"
                                                  >
                                                    Sticker Type
                                                  </Text>
                                                  <VStack
                                                    spacing="8px"
                                                    align="stretch"
                                                  >
                                                    <CustomInput
                                                      name={`items.${idx}.sticker_type_1`}
                                                      method="searchable-dropdown"
                                                      options={materialsOptions}
                                                      placeholder="Select sticker type..."
                                                      viewOnly={isViewMode}
                                                    />
                                                    {[
                                                      "double",
                                                      "looping",
                                                    ].includes(
                                                      item.material_type
                                                    ) && (
                                                      <CustomInput
                                                        name={`items.${idx}.sticker_type_2`}
                                                        method="searchable-dropdown"
                                                        options={
                                                          materialsOptions
                                                        }
                                                        placeholder="Select second sticker type..."
                                                        viewOnly={isViewMode}
                                                      />
                                                    )}
                                                  </VStack>
                                                </Flex>
                                                <Flex
                                                  direction="column"
                                                  gap="4px"
                                                >
                                                  <Text
                                                    fontSize="xs"
                                                    color="gray.600"
                                                    fontWeight="medium"
                                                  >
                                                    Employee
                                                  </Text>
                                                  <CustomInput
                                                    name={`items.${idx}.employee_code`}
                                                    method="searchable-dropdown"
                                                    options={employeeOptions}
                                                    placeholder="Select employee..."
                                                    customRender={
                                                      StickeringEmployeeOptionRenderer
                                                    }
                                                    viewOnly={isViewMode}
                                                  />
                                                </Flex>
                                              </VStack>
                                            </Box>
                                          );
                                        })}
                                      </Flex>
                                    </Box>
                                  </Box>
                                );
                              }
                              const { parentIdx, childIndices } = chunk;
                              const parent = values.items[parentIdx];
                              const gid = parent.split_group_id;
                              const allocated = getSplitAllocatedQty(
                                values.items,
                                gid
                              );
                              const target = parseFloat(
                                parent.split_original_qty
                              );
                              const qtyBalanced =
                                Number.isFinite(target) &&
                                Math.abs(allocated - target) < 0.0001;
                              const parentMat =
                                values.items[parentIdx]?.material_type;
                              return (
                                <Box
                                  key={`split-${gid}`}
                                  borderWidth="1px"
                                  borderRadius="md"
                                  borderColor="orange.300"
                                  bg="orange.50"
                                  p={{ base: 4, md: 5 }}
                                  _dark={{
                                    bg: "whiteAlpha.50",
                                    borderColor: "orange.600",
                                  }}
                                >
                                  <Flex
                                    justify="space-between"
                                    align="flex-start"
                                    flexWrap="wrap"
                                    gap={3}
                                    mb={4}
                                  >
                                    <Box>
                                      <Badge
                                        size="sm"
                                        colorPalette="orange"
                                        mb={2}
                                      >
                                        Split job
                                      </Badge>
                                      <Text fontWeight="semibold" fontSize="sm">
                                        {parent.product_code ||
                                          parent.product_id}
                                        {parent.product_name
                                          ? ` — ${parent.product_name}`
                                          : ""}
                                      </Text>
                                      {parent.is_new_product && (
                                        <Badge
                                          colorPalette="green"
                                          size="xs"
                                          mt={1}
                                        >
                                          New
                                        </Badge>
                                      )}
                                    </Box>
                                    <VStack align="end" gap={1}>
                                      <Text fontSize="xs" color="gray.600">
                                        Total quantity (fixed)
                                      </Text>
                                      <Text fontSize="xl" fontWeight="bold">
                                        {parent.split_original_qty}
                                      </Text>
                                      <HStack
                                        flexWrap="wrap"
                                        justify="flex-end"
                                        gap={2}
                                        align="center"
                                      >
                                        <Badge
                                          colorPalette={
                                            qtyBalanced && !errors?._splitRows
                                              ? "green"
                                              : "orange"
                                          }
                                          size="sm"
                                        >
                                          {allocated} /{" "}
                                          {parent.split_original_qty} assigned
                                        </Badge>
                                        {errors?._splitRows && (
                                          <Text
                                            fontSize="xs"
                                            color="red.600"
                                            fontWeight="medium"
                                          >
                                            {errors._splitRows}
                                          </Text>
                                        )}
                                      </HStack>
                                    </VStack>
                                  </Flex>
                                  <Text fontSize="xs" color="gray.600" mb={2}>
                                    Material and stickers (shared by all lines
                                    below)
                                  </Text>
                                  <Flex flexWrap="wrap" gap={4} mb={5}>
                                    <Box minW="160px" w={{ md: "200px" }}>
                                      <CustomInput
                                        name={`items.${parentIdx}.material_type`}
                                        method="dropdown"
                                        options={MATERIAL_TYPES}
                                        placeholder="Material"
                                        viewOnly={isViewMode}
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          syncSplitGroupSharedFields(
                                            setFieldValue,
                                            values.items,
                                            gid,
                                            { material_type: v }
                                          );
                                        }}
                                      />
                                    </Box>
                                    <Box minW="200px" flex="1">
                                      <VStack gap={2} align="stretch">
                                        <CustomInput
                                          name={`items.${parentIdx}.sticker_type_1`}
                                          method="searchable-dropdown"
                                          options={materialsOptions}
                                          placeholder="Sticker…"
                                          viewOnly={isViewMode}
                                          onChange={(v) => {
                                            syncSplitGroupSharedFields(
                                              setFieldValue,
                                              values.items,
                                              gid,
                                              {
                                                sticker_type_1: v ?? null,
                                              }
                                            );
                                          }}
                                        />
                                        {["double", "looping"].includes(
                                          parentMat
                                        ) && (
                                          <CustomInput
                                            name={`items.${parentIdx}.sticker_type_2`}
                                            method="searchable-dropdown"
                                            options={materialsOptions}
                                            placeholder="2nd sticker…"
                                            viewOnly={isViewMode}
                                            onChange={(v) => {
                                              syncSplitGroupSharedFields(
                                                setFieldValue,
                                                values.items,
                                                gid,
                                                {
                                                  sticker_type_2: v ?? null,
                                                }
                                              );
                                            }}
                                          />
                                        )}
                                      </VStack>
                                    </Box>
                                  </Flex>
                                  <VStack align="stretch" gap={3}>
                                    {childIndices.map((childIdx) => {
                                      const child = values.items[childIdx];
                                      const isAutoBalanceLine =
                                        child?.is_split_auto_balance;
                                      return (
                                        <Flex
                                          key={`c-${childIdx}`}
                                          flexWrap="wrap"
                                          gap={3}
                                          align="flex-end"
                                          p={3}
                                          borderRadius="md"
                                          bg="white"
                                          borderWidth="1px"
                                          borderColor="gray.200"
                                          _dark={{
                                            bg: "blackAlpha.400",
                                            borderColor: "whiteAlpha.200",
                                          }}
                                        >
                                          <Box minW="120px" flex="1">
                                            <Text
                                              fontSize="xs"
                                              color="gray.500"
                                              mb={1}
                                            >
                                              Qty
                                            </Text>
                                            <CustomInput
                                              name={`items.${childIdx}.qty`}
                                              type="number"
                                              min={0.01}
                                              step={0.01}
                                              placeholder="Qty"
                                              viewOnly={
                                                isViewMode || isAutoBalanceLine
                                              }
                                              onChange={(e) => {
                                                if (isAutoBalanceLine) return;
                                                const nextRaw =
                                                  e?.target?.value ?? e;
                                                scheduleRecomputeSplitAutoLine(
                                                  gid,
                                                  {
                                                    idx: childIdx,
                                                    qty: nextRaw,
                                                  }
                                                );
                                              }}
                                            />
                                          </Box>
                                          <Box minW="200px" flex="2">
                                            <Text
                                              fontSize="xs"
                                              color="gray.500"
                                              mb={1}
                                            >
                                              Employee
                                            </Text>
                                            <CustomInput
                                              name={`items.${childIdx}.employee_code`}
                                              method="searchable-dropdown"
                                              options={employeeOptions}
                                              placeholder="Assign employee"
                                              customRender={
                                                StickeringEmployeeOptionRenderer
                                              }
                                              viewOnly={isViewMode}
                                            />
                                          </Box>
                                          {isEditMode && !isAutoBalanceLine && (
                                            <Tooltip content="Remove this line">
                                              <IconButton
                                                aria-label="Remove line"
                                                size="sm"
                                                variant="ghost"
                                                colorPalette="red"
                                                onClick={() => {
                                                  arrayHelpers.remove(childIdx);
                                                  setTimeout(
                                                    () =>
                                                      recomputeSplitAutoLine(
                                                        gid
                                                      ),
                                                    0
                                                  );
                                                }}
                                              >
                                                <MdDeleteOutline size={20} />
                                              </IconButton>
                                            </Tooltip>
                                          )}
                                        </Flex>
                                      );
                                    })}
                                  </VStack>
                                  {isEditMode && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      mt={4}
                                      onClick={() =>
                                        runAddSplitChild(parentIdx)
                                      }
                                    >
                                      <Flex align="center" gap={2}>
                                        <MdAdd size={18} />
                                        Add line
                                      </Flex>
                                    </Button>
                                  )}
                                </Box>
                              );
                            })}
                          </VStack>
                        );
                      }}
                    </FieldArray>
                  </CustomContainer>
                )}

                <Flex gap="22px" justifyContent="flex-end">
                  <Button
                    variant="subtle"
                    onClick={() => {
                      // // Check if we came from /stickering/mine page based on record ownership
                      // // If viewing a record that belongs to current user, go back to /stickering/mine
                      // // Otherwise go back to /stickering
                      // if (stickering && employee_code) {
                      //   if (stickering.employee_code === employee_code) {
                      //     router.push("/stickering/mine");
                      //   } else {
                      //     router.push("/stickering");
                      //   }
                      // } else {
                      //   // Fallback: use router.back() if we can't determine
                      //   router.back();
                      // }
                      router.back();
                    }}
                  >
                    Back
                  </Button>
                  {(isCreateMode || isEditMode) &&
                    values.items &&
                    values.items.length > 0 && (
                      <Button onClick={handleSubmit}>
                        {isCreateMode ? "Create" : "Update"}
                      </Button>
                    )}
                </Flex>
              </Flex>
            );
          }}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}
