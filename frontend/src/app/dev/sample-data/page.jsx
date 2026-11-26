"use client";

import React, { useState } from "react";
import { Box, Button, Flex, Text } from "@chakra-ui/react";
import axiosInstance from "@/api";
import GlobalWrapper from "@/components/GlobalWrapper";
import CustomContainer from "@/components/CustomContainer";
import {
  seedSampleData,
  cleanSampleData,
} from "@/sampleData/seedSampleData.mjs";

const MANIFEST_KEY = "a1-sample-data-manifest";
const ENABLED =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_ENABLE_SAMPLE_DATA === "true";

/** Wrap axiosInstance so non-2xx/JSON bodies reach the seeder unchanged. */
const api = {
  get: (p) => axiosInstance.get(p),
  post: (p, b) => axiosInstance.post(p, b),
  delete: (p) => axiosInstance.delete(p),
};

function readManifest() {
  try {
    return JSON.parse(localStorage.getItem(MANIFEST_KEY) || "{}");
  } catch {
    return {};
  }
}

export default function SampleDataPage() {
  const [lines, setLines] = useState([]);
  const [busy, setBusy] = useState(false);
  const log = (m) => setLines((prev) => [...prev, m]);

  if (!ENABLED) {
    return (
      <GlobalWrapper>
        <Text color="gray.500">Sample data tools are disabled in production.</Text>
      </GlobalWrapper>
    );
  }

  const run = async (fn) => {
    setBusy(true);
    setLines([]);
    try {
      await fn();
    } catch (e) {
      log(`Failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const seed = (force, only = null) =>
    run(async () => {
      const result = await seedSampleData(api, { log, force, only });
      if (!result.skipped) {
        const prev = readManifest();
        const merged = { ...prev };
        for (const [k, ids] of Object.entries(result.manifest)) {
          merged[k] = [...new Set([...(prev[k] || []), ...ids])];
        }
        localStorage.setItem(MANIFEST_KEY, JSON.stringify(merged));
      }
      result.failures?.forEach((f) => log(`  ! ${f}`));
    });

  const clean = () =>
    run(async () => {
      const { failures } = await cleanSampleData(api, readManifest(), { log });
      if (!failures.length) localStorage.removeItem(MANIFEST_KEY);
      failures.forEach((f) => log(`  ! ${f}`));
    });

  return (
    <GlobalWrapper permissionKey="access_all_branches">
      <CustomContainer title="Sample data">
        <Text fontSize="13px" color="gray.600" mb="14px" maxW="680px">
          Adds demo records (tasks, accounts, targets, materials, stock circles on real
          GoFrugal stock, transports, EB readings, account sheets) through the normal
          APIs so every list, view and edit page has something to show. Real branches,
          employees and GoFrugal products are only referenced, never changed. Records
          are tagged “[Sample]” and can be removed with “Remove sample data”.
        </Text>
        <Flex gap="10px" flexWrap="wrap">
          <Button onClick={() => seed(false)} loading={busy} loadingText="Working">
            Add sample data
          </Button>
          <Button variant="outline" onClick={() => seed(true)} disabled={busy}>
            Add another set
          </Button>
          {typeof window !== "undefined" &&
            new URLSearchParams(window.location.search).get("only") && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              const only = new URLSearchParams(window.location.search).get("only");
              seed(true, only ? only.split(",").map((s) => s.trim()) : null);
            }}
          >
            Add only: {new URLSearchParams(window.location.search).get("only")}
          </Button>
          )}
          <Button variant="subtle" colorPalette="red" onClick={clean} disabled={busy}>
            Remove sample data
          </Button>
        </Flex>
        {lines.length > 0 && (
          <Box
            mt="16px"
            p="14px"
            bg="gray.50"
            borderRadius="10px"
            fontFamily="mono"
            fontSize="12px"
            whiteSpace="pre-wrap"
            data-testid="seed-log"
          >
            {lines.join("\n")}
          </Box>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}
