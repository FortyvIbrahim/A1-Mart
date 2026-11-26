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
        return (
          <Flex justifyContent="center" alignItems="center" height={"100%"}>
            <CustomMenu items={props.value ?? []} />
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
          <Badge colorPalette={props.value?.colorScheme}>
            {capitalizeWordsLatest(props.value?.label)}
          </Badge>
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
    image: {
      filter: false,
      resizable: false,
      flex: 0,
      width: 130,
      autoHeight: true,
      cellRenderer: (props) => {
        const objectFit =
          props.column?.colDef?.imageSettings?.objectFit || "cover";
        return (
          <Flex
            justifyContent="center"
            alignItems="center"
            height={"100px"}
            width={"100px"}
            m="4px"
            overflow="hidden"
            position="relative"
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
        );
      },
    },
  };
}
