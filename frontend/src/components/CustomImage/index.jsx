import { Flex } from "@chakra-ui/react";
import Image from "next/image";
import React from "react";
import EmptyImage from "../EmptyImage";

function CustomImage(props) {
  const { src, height = "100px", width = "100px", alt = "image" } = props;

  return (
    <Flex
      justifyContent="center"
      alignItems="center"
      height={height}
      width={width}
      m="4px"
      overflow="hidden"
      position="relative"
    >
      {src ? (
        <Image src={src} alt={alt} fill style={{ objectFit: "cover" }} />
      ) : (
        <EmptyImage noPadding height={height} width={width} />
      )}
    </Flex>
  );
}

export default CustomImage;
