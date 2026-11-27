"use client";

/**
 * AgGrid column type definitions.
 * Pinned bottom row: date/datetime/currency show empty (null) instead of '-' when value is missing.
 */

import { Badge, Button, Flex, FormatNumber } from "@chakra-ui/react";
import Image from "next/image";
import moment from "moment";
import { capitalizeWords, capitalizeWordsLatest } from "@/utils/string";
import BadgeColumnFilter from "./BadgeColumnFilter";
import EmptyImage from "../EmptyImage";
import CustomMenu from "../CustomMenu";
import Link from "next/link";

/** Figma badge colours (fill / text) keyed by Chakra palette name. */
const FIGMA_BADGE = {
  green: { bg: "#E8F6EF", color: "#147D52" },
  teal: { bg: "#E8F6EF", color: "#147D52" },
  red: { bg: "#FDECEE", color: "#BC3745" },
  pink: { bg: "#FDECEE", color: "#BC3745" },
  yellow: { bg: "#FFF4DB", color: "#946200" },
  orange: { bg: "#FFF5ED", color: "#C95C18" },
  brand: { bg: "#FFF5ED", color: "#C95C18" },
  blue: { bg: "#EEF3FC", color: "#3E5B94" },
};

/** Figma "Badge / …": 5px radius, 6/8 padding, 10/500 text. */
export function FigmaBadge({ colorScheme, children }) {
  const figma = FIGMA_BADGE[colorScheme];
  return (
    <Badge
      colorPalette={figma ? undefined : colorScheme}
      bg={figma?.bg}
      color={figma?.color}
      borderRadius="5px"
      px="8px"
      py="6px"
      fontSize="10px"
      lineHeight="12px"
      fontWeight="500"
    >
      {children}
    </Badge>
  );
}

export function getColumnTypes() {
  return {
    id: {
      headerName: "ID",
      maxWidth: 100,
      resizable: false,
    },
    capitalized: {
      cellRenderer: (props) => {
        return props.value !== null &&
          props.value !== undefined &&
          props.value !== ""
          ? capitalizeWords(props.value)
          : "-";
      },
    },
    "new-capitalized": {
      cellRenderer: (props) => {
        return props.value !== null &&
          props.value !== undefined &&
          props.value !== ""
          ? capitalizeWordsLatest(props.value)
          : "-";
      },
    },
    "action-column": {
      filter: false,
      resizable: false,
      flex: 0,
      maxWidth: 100,
      minWidth: 100,
      width: 100,
      cellRenderer: (props) => {
        if (props.node?.rowPinned === "bottom") return null;
        const items = props.value ?? [];
        // One action → plain text link, as in the Figma tables ("View", "Delete").
        if (items.length === 1 && !items[0].redirectionUrl) {
          const [item] = items;
          const danger = item.type === "danger";
          return (
            <Flex alignItems="center" height={"100%"}>
              <Button
                variant="plain"
                size="xs"
                h="auto"
                p="0"
                minW="0"
                fontSize={danger ? "12px" : "11px"}
                fontWeight={danger ? "500" : "400"}
                color={danger ? "#C63732" : "fg"}
                _hover={{ color: danger ? "#A52A26" : "#C95C18" }}
                onClick={item.onClick}
              >
                {item.shortLabel ?? item.label}
              </Button>
            </Flex>
          );
        }
        return (
          <Flex justifyContent="center" alignItems="center" height={"100%"}>
            <CustomMenu items={items} />
          </Flex>
        );
      },
    },
    "badge-column": {
      wrapText: true,
      autoHeight: true,
      cellRenderer: (props) => {
        if (props.node?.rowPinned === "bottom") return null;
        if (!props.value?.label) {
          return "-";
        }

        return (
          <FigmaBadge colorScheme={props.value?.colorScheme}>
            {capitalizeWordsLatest(props.value?.label)}
          </FigmaBadge>
        );
      },
      filter: {
        component: BadgeColumnFilter,
        handler: "badgeFilterHandler",
      },
    },
    /** Plain numeric cells; shows "-" when value is null/undefined/empty (not for currency). */
    number: {
      cellRenderer: (props) => {
        const v = props.value;
        const isEmpty =
          v === null ||
          v === undefined ||
          v === "" ||
          (typeof v === "number" && Number.isNaN(v));
        if (isEmpty) {
          if (props.node?.rowPinned === "bottom") return null;
          return "-";
        }
        return (
          <FormatNumber
            value={Number(v)}
            maximumFractionDigits={2}
            minimumFractionDigits={0}
          />
        );
      },
      comparator: (valueA, valueB) => {
        const toNumber = (x) => {
          if (x === null || x === undefined || x === "") return NaN;
          const n = Number(x);
          return Number.isNaN(n) ? NaN : n;
        };
        const a = toNumber(valueA);
        const b = toNumber(valueB);
        if (Number.isNaN(a) && Number.isNaN(b)) return 0;
        if (Number.isNaN(a)) return -1;
        if (Number.isNaN(b)) return 1;
        return a - b;
      },
    },
    currency: {
      cellRenderer: (props) => {
        const v = props.value;
        const isEmpty =
          v === null ||
          v === undefined ||
          v === "" ||
          (typeof v === "number" && Number.isNaN(v)) ||
          (typeof v === "string" && v === "NaN");
        if (isEmpty) {
          if (props.node?.rowPinned === "bottom") return null;
          return "-";
        }

        return (
          <FormatNumber
            value={props.value}
            style="currency"
            currency="INR"
            minimumFractionDigits={0}
            maximumFractionDigits={2}
          />
        );
      },
      comparator: (valueA, valueB) => {
        const toNumber = (v) => {
          if (v === null || v === undefined || v === "") return NaN;
          if (typeof v === "number") return v;
          const cleaned = String(v).replace(/[^\d.-]/g, "");
          const n = parseFloat(cleaned);
          return Number.isNaN(n) ? NaN : n;
        };

        const a = toNumber(valueA);
        const b = toNumber(valueB);

        if (Number.isNaN(a) && Number.isNaN(b)) return 0;
        if (Number.isNaN(a)) return -1;
        if (Number.isNaN(b)) return 1;
        return a - b;
      },
    },
    date: {
      filter: "agDateColumnFilter",
      valueGetter: (props) => {
        if (props.node?.rowPinned === "bottom") return null;
        const date = new Date(
          props.data?.[props.column?.colDef?.field] ?? props.data?.created_at
        );
        date.setHours(0, 0, 0, 0);
        return date;
      },
      cellRenderer: (props) => {
        if (!props.value) {
          if (props.node?.rowPinned === "bottom") return null;
          return "-";
        }
        return moment(props.value).format("DD MMM YYYY");
      },
    },
    datetime: {
      filter: "agDateColumnFilter",
      valueGetter: (props) => {
        if (props.node?.rowPinned === "bottom") return null;
        const date = new Date(
          props.data?.[props.column?.colDef?.field] ?? props.data?.created_at
        );
        return date;
      },
      cellRenderer: (props) => {
        if (!props.value) {
          if (props.node?.rowPinned === "bottom") return null;
          return "-";
        }
        return moment(props.value).format("DD/MM/YYYY • hh:mm A");
      },
    },
    file: {
      cellRenderer: (props) => {
        if (props.node?.rowPinned === "bottom") return null;
        const url = props.value;
        if (!url || typeof url !== "string") {
          return "-";
        }
        return (
          <Link href={url} target="_blank" rel="noopener noreferrer">
            <Button size="xs" variant="ghost" colorPalette="secondary">
              Open File
            </Button>
          </Link>
        );
      },
      filter: false,
    },
    /**
     * Figma person avatar: round photo, or initials on #FFF5ED in #C95C18.
     * colDef.avatarSize (default 32) · colDef.avatarNameField (default "employee_name").
     */
    avatar: {
      filter: false,
      sortable: false,
      resizable: false,
      flex: 0,
      width: 76,
      cellRenderer: (props) => {
        if (props.node?.rowPinned === "bottom") return null;
        const size = props.column?.colDef?.avatarSize ?? 32;
        const nameField = props.column?.colDef?.avatarNameField ?? "employee_name";
        const name = String(props.data?.[nameField] ?? "").trim();
        const initials =
          name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0])
            .join("")
            .toUpperCase() || "—";
        return (
          <Flex alignItems="center" height="100%">
            <Flex
              alignItems="center"
              justifyContent="center"
              w={`${size}px`}
              h={`${size}px`}
              borderRadius="full"
              overflow="hidden"
              position="relative"
              bg="#FFF5ED"
              color="#C95C18"
              fontSize="10px"
              fontWeight="600"
              flexShrink={0}
            >
              {props.value ? (
                <Image src={props.value} alt={name || "Photo"} fill sizes={`${size}px`} style={{ objectFit: "cover" }} />
              ) : (
                initials
              )}
            </Flex>
          </Flex>
        );
      },
    },
    image: {
      filter: false,
      resizable: false,
      flex: 0,
      width: 96,
      cellStyle: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
      cellRenderer: (props) => {
        const objectFit =
          props.column?.colDef?.imageSettings?.objectFit || "contain";
        // Figma table thumbnail: centered in cell.
        return (
          <Flex w="100%" h="100%" justifyContent="center" alignItems="center">
            <Flex
              justifyContent="center"
              alignItems="center"
              height="40px"
              width="40px"
              borderRadius="6px"
              overflow="hidden"
              position="relative"
              bg="#FFFBF8"
            >
              {props.value ? (
                <Image
                  src={props.value}
                  alt="Product Image"
                  fill
                  style={{ objectFit }}
                />
              ) : (
                <EmptyImage />
              )}
            </Flex>
          </Flex>
        );
      },
    },
  };
}
