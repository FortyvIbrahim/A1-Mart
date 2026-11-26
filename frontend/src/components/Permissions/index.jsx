import { Grid, Checkbox, Flex, Text, Accordion } from "@chakra-ui/react";
import React from "react";
import { PERMISSIONS } from "@/constants/permissions";

const CustomCheckbox = ({ checked, onClick }) => {
  return (
    <Checkbox.Root
      checked={checked}
      onClick={(e) => {
        e.preventDefault();
        onClick(!checked);
      }}
      size="sm"
    >
      <Checkbox.HiddenInput />
      <Checkbox.Control>
        <Checkbox.Indicator />
      </Checkbox.Control>
    </Checkbox.Root>
  );
};

const PermissionCheckbox = ({ permission, isChecked, onPermissionsChange }) => {
  if (!permission) {
    return <Text>-</Text>;
  }
  return (
    <CustomCheckbox
      checked={isChecked}
      onClick={(value) => onPermissionsChange(permission, value)}
    />
  );
};

function Permissions({ permissions, onPermissionsChange }) {
  return (
    <Flex flexDirection="column" gap="22px" maxW="900px">
      <Grid
        w="100%"
        templateColumns="1.5fr 1fr 1fr 1fr"
        fontWeight="semibold"
        fontSize="sm"
        color="gray.500"
      >
        <Text>Permissions</Text>
        <Text>View</Text>
        <Text>Add</Text>
        <Text>Delete</Text>
      </Grid>

      <Accordion.Root multiple>
        {Object.entries(PERMISSIONS).map(([groupKey, group]) => (
          <Accordion.Item key={groupKey} value={groupKey} mb="16px" pb="16px">
            <Accordion.ItemTrigger>
              <Flex alignItems="center" justifyContent="space-between" w="100%">
                <Flex alignItems="center" gap="8px" color="gray.500">
                  {/* <i
                    className={`fa ${group.icon}`}
                    style={{ fontSize: "12px" }}
                  /> */}
                  <Text textStyle="sm" color="gray.600">
                    {group.title}
                  </Text>
                </Flex>
                <Accordion.ItemIndicator>
                  <i
                    className="fa fa-chevron-down"
                    style={{ fontSize: "12px", color: "gray.500" }}
                  />
                </Accordion.ItemIndicator>
              </Flex>
            </Accordion.ItemTrigger>
            <Accordion.ItemContent>
              <Flex flexDirection="column" gap="16px" mt="16px">
                {Object.entries(group.items).map(([itemKey, item]) => (
                  <Grid
                    key={itemKey}
                    w="100%"
                    templateColumns="1.5fr 1fr 1fr 1fr"
                    gap="22px"
                  >
                    <Text fontSize="sm" color="gray.600">
                      {item.title}
                    </Text>
                    <PermissionCheckbox
                      permission={item.permissions.view}
                      isChecked={permissions.includes(item.permissions.view)}
                      onPermissionsChange={onPermissionsChange}
                    />
                    <PermissionCheckbox
                      permission={item.permissions.add}
                      isChecked={permissions.includes(item.permissions.add)}
                      onPermissionsChange={onPermissionsChange}
                    />
                    <PermissionCheckbox
                      permission={item.permissions.delete}
                      isChecked={permissions.includes(item.permissions.delete)}
                      onPermissionsChange={onPermissionsChange}
                    />
                  </Grid>
                ))}
              </Flex>
            </Accordion.ItemContent>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </Flex>
  );
}

export default Permissions;
