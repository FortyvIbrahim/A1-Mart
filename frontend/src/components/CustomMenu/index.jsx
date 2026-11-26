import { IconButton, Menu, Portal } from "@chakra-ui/react";
import Link from "next/link";
import React from "react";

function CustomMenu({ items, colorPalette = "secondary", customButton }) {
  const getMenuItem = ({
    onClick,
    type = "normal",
    label,
    value,
    redirectionUrl,
    target,
    rel,
  }) => {
    const style = {
      normal: { fontSize: "12px", cursor: "pointer" },
      danger: {
        color: "fg.error",
        _hover: { bg: "bg.error", color: "fg.error" },
        fontSize: "12px",
        cursor: "pointer",
      },
      link: {
        color: "secondary500",
        _hover: { color: "secondary600" },
        fontSize: "12px",
        cursor: "pointer",
      },
      "status-change": {
        color: "brand500",
        _hover: { color: "brand600" },
        fontSize: "12px",
        cursor: "pointer",
      },
    };

    if (redirectionUrl) {
      const linkRel =
        rel ?? (target === "_blank" ? "noopener noreferrer" : undefined);
      return (
        <Link
          key={value}
          href={redirectionUrl}
          target={target}
          rel={linkRel}
          style={{ textDecoration: "none", color: "inherit", outline: "none" }}
        >
          <Menu.Item value={value} {...style[type]} onClick={onClick}>
            {label}
          </Menu.Item>
        </Link>
      );
    }

    return (
      <Menu.Item key={value} value={value} {...style[type]} onClick={onClick}>
        {label}
      </Menu.Item>
    );
  };

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        {customButton ? (
          customButton
        ) : (
          <IconButton
            colorPalette={colorPalette}
            variant="ghost"
            size="2xs"
            disabled={items.length === 0}
          >
            <i className="fa fa-ellipsis-v" aria-hidden="true"></i>
          </IconButton>
        )}
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>{items.map((item) => getMenuItem(item))}</Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

export default CustomMenu;
