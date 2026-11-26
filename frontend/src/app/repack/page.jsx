"use client";

import { useReturnItem } from "@/api/customHooks/useReturnItem";
import AgGrid from "@/components/AgGrid";
import CustomSelectEditor from "@/components/AgGrid/CustomSelectEditor";
import CustomContainer from "@/components/CustomContainer";
import GlobalWrapper from "@/components/GlobalWrapper";
import {
  BOOLEAN_LIST,
  findItem,
  PACKAGING_MATERIAL_LIST,
  PACKAGING_MATERIAL_SIZE_LIST,
  PACKAGING_TYPE_LIST,
} from "@/constants/repackItems";
import { capitalizeWords } from "@/utils/string";
import React, { useCallback } from "react";
import toast from "react-hot-toast";

function Repack() {
  const {
    returnItems: itemsList,
    loading,
    createReturnItem,
    setReturnItems: setItemsList,
  } = useReturnItem();

  const colDefs = [
    {
      field: "item_id",
      headerName: "ID",
      maxWidth: 120,
      resizable: false,
    },
    {
      field: "gf_item_name",
      headerName: "Name",
      resizable: true,
      minWidth: 200,
      cellRenderer: (props) => capitalizeWords(props.value),
    },
    {
      field: "measure",
      headerName: "Package Sise",
      resizable: true,
      cellRenderer: (params) => `${params.data.measure} gms`,
    },
    {
      field: "cleaning",
      headerName: "Cleaning",
      resizable: true,
      cellRenderer: (props) => findItem(BOOLEAN_LIST, props.data.cleaning),
      cellEditor: CustomSelectEditor,
      editable: true,
      cellEditorParams: {
        options: BOOLEAN_LIST,
      },
    },
    {
      field: "packing_type",
      headerName: "Packing Type",
      resizable: true,
      cellRenderer: (props) =>
        findItem(PACKAGING_TYPE_LIST, props.data.packing_type),
      cellEditor: CustomSelectEditor,
      editable: true,
      cellEditorParams: {
        options: PACKAGING_TYPE_LIST,
      },
    },
    {
      field: "packing_material",
      headerName: "Packing Material",
      resizable: true,
      cellRenderer: (props) =>
        findItem(PACKAGING_MATERIAL_LIST, props.data.packing_material),
      cellEditor: CustomSelectEditor,
      editable: true,
      cellEditorParams: {
        options: PACKAGING_MATERIAL_LIST,
      },
    },
    {
      field: "packing_material_size",
      headerName: "Packing Material Size",
      resizable: true,
      cellRenderer: (props) =>
        findItem(
          PACKAGING_MATERIAL_SIZE_LIST,
          props.data.packing_material_size
        ),
      cellEditor: CustomSelectEditor,
      editable: true,
      cellEditorParams: {
        options: PACKAGING_MATERIAL_SIZE_LIST,
      },
    },
    {
      field: "sticker",
      headerName: "Sticker",
      resizable: true,
      cellRenderer: (props) => findItem(BOOLEAN_LIST, props.data.sticker),
      cellEditor: CustomSelectEditor,
      editable: true,
      cellEditorParams: {
        options: BOOLEAN_LIST,
      },
    },
  ];

  const onRowValueChanged = useCallback((event) => {
    const data = event.data;
    handleSave(data);
  }, []);

  const handleSave = (data) => {
    try {
      const params = {
        item_id: data.item_id,
        cleaning:
          data.cleaning == 1 ? true : data.cleaning == 0 ? false : undefined,
        packing_type: data.packing_type,
        packing_material: data.packing_material,
        packing_material_size: data.packing_material_size,
        sticker:
          data.sticker == 1 ? true : data.sticker == 0 ? false : undefined,
      };

      toast.promise(createReturnItem(params), {
        loading: "Saving item",
        success: (response) => {
          if (response.code === 200) {
            return "Item saved successfully!";
          }

          throw response;
        },
        error: (err) => {
          console.error("Error saving item:", err);
          return "Failed to save item";
        },
      });
    } catch (error) {
      console.error("Error saving sheet:", error);
    }
  };

  return (
    <GlobalWrapper permissionKey="view_items">
      <CustomContainer title="Repack Items List">
        <AgGrid
          rowData={itemsList}
          columnDefs={colDefs}
          editType="fullRow"
          onRowValueChanged={onRowValueChanged}
          tableKey="repack-items-list"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Repack;
