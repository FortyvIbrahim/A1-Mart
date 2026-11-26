import { IconButton, Text } from "@chakra-ui/react";
import { Tooltip } from "../ui/tooltip";
import Link from "next/link";
import React from "react";

function HeaderIcon({
  iconKey,
  name,
  redirectionUrl,
  onClick,
  notificationCount = 0,
  colorPalette = "brand",
}) {
  const showNotificationCount = notificationCount > 0;

  const content = (
    <Tooltip content={name}>
      <IconButton
        variant="ghost"
        onClick={onClick}
        paddingInline={showNotificationCount ? "6px" : "unset"}
        colorPalette={colorPalette}
      >
        <i
          className={`fa fa-${iconKey}`}
          style={{ color: `var(--chakra-colors-${colorPalette}-600)` }}
        ></i>
        {showNotificationCount && <Text>({notificationCount})</Text>}
      </IconButton>
    </Tooltip>
  );

  if (redirectionUrl) {
    return <Link href={redirectionUrl}>{content}</Link>;
  }

  return content;
}

export default HeaderIcon;
