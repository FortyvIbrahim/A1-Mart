import { CloseButton, Drawer, Portal } from "@chakra-ui/react";

const CustomDrawer = ({
  children,
  title,
  content,
  footer,
  size = "xs",
  isOpen,
  setIsOpen,
}) => {
  return (
    <Drawer.Root
      size={size}
      open={isOpen}
      onOpenChange={(e) => setIsOpen(e.open)}
    >
      {children != null && <Drawer.Trigger asChild>{children}</Drawer.Trigger>}
      <Portal>
        <Drawer.Backdrop bg="rgba(31, 41, 55, 0.3)" backdropFilter="blur(2px)" />
        <Drawer.Positioner padding="3">
          <Drawer.Content
            rounded="16px"
            bg="white"
            boxShadow="0 24px 60px rgba(31, 41, 55, 0.18)"
            style={{ height: "100%" }}
          >
            <Drawer.Header borderBottomWidth="1px" borderColor="border.muted" py="16px">
              <Drawer.Title color="gray.800" fontSize="16px" fontWeight="700">
                {title}
              </Drawer.Title>
            </Drawer.Header>
            <Drawer.Body color="gray.800" py="18px">
              {content}
            </Drawer.Body>
            <Drawer.Footer p="16px" borderTopWidth="1px" borderColor="border.muted">
              {footer}
            </Drawer.Footer>
            <Drawer.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Drawer.CloseTrigger>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
};

export default CustomDrawer;
