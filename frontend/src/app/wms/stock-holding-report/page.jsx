"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Box, Button, Flex, SimpleGrid, Text } from "@chakra-ui/react";
import moment from "moment";
import toast from "react-hot-toast";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import usePermission from "@/customHooks/usePermission";
import useDeleteModal from "@/customHooks/useDeleteModal";
import {
  deleteStockHoldingReport,
  getStockHoldingReports,
  syncStockHoldingReport,
} from "@/api/helpers/stock_holding_report";
import { clearAllCachedReports } from "@/utils/stockHoldingDashboardCache";
import { STOCK_HOLDING_REPORT_ROUTES } from "@/constants/routes/index";

function formatReportDate(value) {
  if (!value) return "—";
  const m = moment(value);
  return m.isValid() ? m.format("DD MMM YYYY") : String(value);
}

function formatDateTime(value) {
  if (!value) return "—";
  const m = moment(value);
  return m.isValid() ? m.format("DD MMM YYYY, hh:mm A") : String(value);
}

function ReportDetail({ label, value }) {
  return (
    <Box>
      <Text
        fontSize="xs"
        fontWeight="medium"
        color="gray.500"
        textTransform="uppercase"
      >
        {label}
      </Text>
      <Text fontSize="md" fontWeight="semibold" color="gray.800" mt={1}>
        {value}
      </Text>
    </Box>
  );
}

export default function StockHoldingReportPage() {
  const canSync = usePermission(STOCK_HOLDING_REPORT_ROUTES.create.permissionKey);
  const canDelete = usePermission("delete_stock_holding_report");
  const { openDeleteModal, DeleteModalComponent } = useDeleteModal();

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getStockHoldingReports();
      const list = Array.isArray(response?.data) ? response.data : [];
      const latest = list.length
        ? [...list].sort(
            (a, b) =>
              Number(b.stock_holding_report_id) -
              Number(a.stock_holding_report_id)
          )[0]
        : null;
      setCurrentReport(latest);
    } catch (err) {
      toast.error(err?.message || "Failed to load stock holding report.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const response = await syncStockHoldingReport();
      await clearAllCachedReports();
      toast.success(
        `Stock holding report synced (${Number(
          response?.data?.imported_rows ?? response?.data?.item_count ?? 0
        ).toLocaleString()} rows).`
      );
      fetchReports();
    } catch (err) {
      toast.error(err?.message || "Failed to sync stock holding report.");
    } finally {
      setSyncing(false);
    }
  }, [fetchReports]);

  const handleDelete = useCallback(() => {
    const id = currentReport?.stock_holding_report_id;
    if (!id) return;
    openDeleteModal({
      title: "Delete Stock Holding Report",
      message:
        "Are you sure you want to delete the current stock holding report? This action cannot be undone.",
      onDelete: async () => {
        await deleteStockHoldingReport(id);
        await clearAllCachedReports();
        toast.success("Stock holding report deleted.");
        fetchReports();
      },
    });
  }, [openDeleteModal, currentReport, fetchReports]);

  return (
    <GlobalWrapper
      title="Stock Holding Report"
      permissionKey={STOCK_HOLDING_REPORT_ROUTES.listing.permissionKey}
    >
      <DeleteModalComponent />
      <CustomContainer
        title="Stock Holding Report"
        filledHeader
        rightSection={
          canSync ? (
            <Button
              onClick={handleSync}
              colorPalette="brand"
              size="sm"
              loading={syncing}
              loadingText="Syncing..."
            >
              Sync Now
            </Button>
          ) : null
        }
      >
        <Text fontSize="sm" color="gray.600" mb={4}>
          Stock holding data is fetched automatically from Delium every day at
          7:30 AM. Each successful sync replaces the previous report and powers
          the stock holding dashboard.
        </Text>

        {loading ? (
          <Text py={4} color="gray.600">
            Loading...
          </Text>
        ) : currentReport ? (
          <Box
            borderWidth="1px"
            borderRadius="md"
            borderColor="gray.200"
            overflow="hidden"
            bg="white"
          >
            <Flex
              justify="space-between"
              align={{ base: "stretch", md: "center" }}
              direction={{ base: "column", md: "row" }}
              gap={4}
              px={5}
              py={4}
              bg="gray.50"
              borderBottomWidth="1px"
              borderColor="gray.200"
            >
              <Box>
                <Text fontSize="lg" fontWeight="semibold" color="gray.800">
                  {currentReport.report_name || "Stock Holding Report"}
                </Text>
                <Text fontSize="sm" color="gray.500" mt={1}>
                  Report #{currentReport.stock_holding_report_id}
                </Text>
              </Box>
              {canDelete ? (
                <Button
                  colorPalette="red"
                  variant="outline"
                  size="sm"
                  alignSelf={{ base: "flex-start", md: "center" }}
                  onClick={handleDelete}
                >
                  Delete Report
                </Button>
              ) : null}
            </Flex>

            <Box px={5} py={5}>
              <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={5}>
                <ReportDetail
                  label="Report date"
                  value={formatReportDate(currentReport.date)}
                />
                <ReportDetail
                  label="Last synced"
                  value={formatDateTime(currentReport.created_at)}
                />
                <ReportDetail
                  label="Synced by"
                  value={
                    Number(currentReport.is_system_sync) === 1
                      ? "System"
                      : currentReport.created_by_name || "—"
                  }
                />
              </SimpleGrid>
            </Box>
          </Box>
        ) : (
          <Box
            borderWidth="1px"
            borderRadius="md"
            borderColor="gray.200"
            p={6}
            bg="gray.50"
          >
            <Text color="gray.600">
              No stock holding report available yet. Data will appear after the
              next scheduled sync at 7:30 AM, or use Sync Now if you have
              permission.
            </Text>
          </Box>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}
