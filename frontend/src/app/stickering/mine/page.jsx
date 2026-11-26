"use client";

import Stickering from "@/components/Stickering";
import { Center, Spinner } from "@chakra-ui/react";
import { Suspense } from "react";

function StickeringListFallback() {
  return (
    <Center minH="200px">
      <Spinner size="lg" colorPalette="brand" />
    </Center>
  );
}

export default function StickeringPage() {
  return (
    <Suspense fallback={<StickeringListFallback />}>
      <Stickering permissionKey="view_my_stickering" type="my_stickering" />
    </Suspense>
  );
}
