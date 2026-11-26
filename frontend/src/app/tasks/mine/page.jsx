"use client";

import GlobalWrapper from "@/components/GlobalWrapper";
import TaskBoard from "@/components/TaskBoard";

export default function MyTasks() {
  return (
    <GlobalWrapper permissionKey="view_my_tasks">
      <TaskBoard mode="mine" />
    </GlobalWrapper>
  );
}
