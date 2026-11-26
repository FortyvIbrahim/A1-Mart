import { Button, Flex } from "@chakra-ui/react";
import React from "react";

const VIEWS = [
  { value: "branch", label: "Branch" },
  { value: "department", label: "Department" },
  { value: "section", label: "Section" },
  { value: "employee", label: "Employee" },
];

function ViewSelector({ currentView, onViewChange }) {
  return (
    <Flex gap={2} flexWrap="wrap">
      {VIEWS.map((view) => (
        <Button
          key={view.value}
          size="sm"
          variant={currentView === view.value ? "solid" : "outline"}
          colorScheme={currentView === view.value ? "brand" : "gray"}
          onClick={() => onViewChange(view.value)}
        >
          {view.label}
        </Button>
      ))}
    </Flex>
  );
}

export default ViewSelector;

