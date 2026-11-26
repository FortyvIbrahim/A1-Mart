"use client";

import GlobalWrapper from "@/components/GlobalWrapper";
import TaskBoard from "@/components/TaskBoard";

export default function Tasks() {
  return (
    <GlobalWrapper permissionKey="view_tasks">
      <TaskBoard mode="all" />
    </GlobalWrapper>
  );
}
