import {
  Box,
  Text,
  Flex,
  Badge,
  HStack,
  VStack,
  IconButton,
} from "@chakra-ui/react";
import CustomContainer from "@/components/CustomContainer";
import { motion } from "framer-motion";
import moment from "moment";
import React from "react";

function QuestionCard({
  question: data,
  index,
  totalItems,
  onMoveUp,
  onMoveDown,
  onRemove,
  isViewMode = false,
  onClick,
}) {
  const {
    question,
    description,
    question_type,
    fill_at_from,
    fill_at_to,
    is_required,
    record_audio,
    take_image,
    is_image_optional,
    take_video,
    is_video_optional,
    allow_comment,
    is_comment_optional,
  } = data;

  const formatQuestionType = (type) => {
    if (!type) return "";
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const features = [
    record_audio && {
      label: "Audio",
      icon: "🎤",
      optional: false,
    },
    take_image && {
      label: "Image",
      icon: "📷",
      optional: is_image_optional,
    },
    take_video && {
      label: "Video",
      icon: "🎥",
      optional: is_video_optional,
    },
    allow_comment && {
      label: "Comment",
      icon: "💬",
      optional: is_comment_optional,
    },
  ].filter(Boolean);

  const formatTime12 = (v) => {
    const s = v != null ? String(v).trim() : "";
    if (!s) return "";
    // Most inputs are stored as "HH:mm" from <input type="time">
    if (/^\d{1,2}:\d{2}$/.test(s)) {
      const m = moment(s, "HH:mm", true);
      return m.isValid() ? m.format("hh:mm A") : s;
    }
    return s;
  };

  const formatTimeframe = (from, to) => {
    const f = formatTime12(from);
    const t = formatTime12(to);
    if (!f && !t) return "";
    if (f && t) return `${f}-${t}`;
    if (f) return `From ${f}`;
    return `To ${t}`;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{
        opacity: 0,
        scale: 0.8,
        height: 0,
        marginBottom: 0,
        transition: { duration: 0.2 },
      }}
      transition={{
        layout: { duration: 0.3, ease: "easeInOut" },
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 },
      }}
      style={{ marginBottom: "16px" }}
    >
      <Box
        border="0.5px solid transparent"
        borderRadius="8px"
        transition="all 0.2s"
        bg="white"
        _hover={{
          border: "0.5px solid",
          borderColor: "brand.300",
        }}
        onClick={onClick}
      >
        <CustomContainer color="brand" size="sm">
          <VStack spacing={{ base: 2, md: 3 }} align="stretch">
            {/* Header: Question Title with Badges */}
            <Flex
              direction={{ base: "column", sm: "row" }}
              justify="space-between"
              align={{ base: "flex-start", sm: "flex-start" }}
              gap={{ base: 2, md: 3 }}
              wrap="wrap"
            >
              <Box flex={1} minW={0} width={{ base: "100%", sm: "auto" }}>
                <HStack
                  gap={2}
                  mb={description ? 1 : 0}
                  align="flex-start"
                  flexWrap="wrap"
                >
                  <Text
                    fontSize={{ base: "xs", md: "xs" }}
                    color="brand500"
                    fontWeight="medium"
                    minW="fit-content"
                    mt="2px"
                    flexShrink={0}
                  >
                    Q{index + 1}
                  </Text>
                  <Text
                    fontSize={{ base: "sm", md: "md" }}
                    fontWeight="semibold"
                    color="gray.800"
                    noOfLines={2}
                    flex={1}
                    minW={0}
                  >
                    {question || "Untitled Question"}
                  </Text>
                </HStack>
                {description && (
                  <Text
                    fontSize={{ base: "xs", md: "sm" }}
                    color="gray.600"
                    noOfLines={2}
                    mt={{ base: 1, md: 0 }}
                  >
                    {description}
                  </Text>
                )}
              </Box>
              <HStack
                gap={{ base: 1.5, md: 2 }}
                flexShrink={0}
                align="center"
                width={{ base: "100%", sm: "auto" }}
                justify={{ base: "space-between", sm: "flex-end" }}
                flexWrap="wrap"
              >
                {is_required && (
                  <Badge
                    colorPalette="secondary"
                    variant="solid"
                    size={{ base: "sm", md: "sm" }}
                  >
                    Required
                  </Badge>
                )}
                {!is_required && (
                  <Badge
                    colorPalette="gray"
                    variant="subtle"
                    size={{ base: "sm", md: "sm" }}
                  >
                    Optional
                  </Badge>
                )}
                {!isViewMode && (
                  <HStack gap={{ base: 0.5, md: 1 }}>
                    <IconButton
                      size={{ base: "sm", md: "xs" }}
                      variant="ghost"
                      colorPalette="gray"
                      onClick={onMoveUp}
                      disabled={index === 0}
                      title="Move up"
                    >
                      <i className="fa fa-arrow-up" />
                    </IconButton>
                    <IconButton
                      size={{ base: "sm", md: "xs" }}
                      variant="ghost"
                      colorPalette="gray"
                      onClick={onMoveDown}
                      disabled={index === totalItems - 1}
                      title="Move down"
                    >
                      <i className="fa fa-arrow-down" />
                    </IconButton>
                    <IconButton
                      size={{ base: "sm", md: "xs" }}
                      variant="ghost"
                      colorPalette="red"
                      onClick={onRemove}
                      title="Remove"
                    >
                      <i className="fa fa-trash" />
                    </IconButton>
                  </HStack>
                )}
              </HStack>
            </Flex>

            {/* Question Details */}
            <Flex
              gap={{ base: 2, md: 3 }}
              wrap="wrap"
              align={{ base: "flex-start", sm: "center" }}
              flexDirection={{ base: "column", sm: "row" }}
            >
              {question_type && (
                <Badge
                  colorPalette="blue"
                  variant="outline"
                  size={{ base: "sm", md: "sm" }}
                >
                  {formatQuestionType(question_type)}
                </Badge>
              )}
              {(fill_at_from || fill_at_to) && (
                <Badge
                  colorPalette="orange"
                  variant="outline"
                  size={{ base: "sm", md: "sm" }}
                >
                  Fill At: {formatTimeframe(fill_at_from, fill_at_to)}
                </Badge>
              )}
            </Flex>

            {/* Features Row */}
            {features.length > 0 && (
              <Box>
                <Text
                  fontSize={{ base: "xs", md: "xs" }}
                  color="gray.500"
                  mb={{ base: 1.5, md: 2 }}
                  fontWeight="medium"
                >
                  Metadata:
                </Text>
                <HStack
                  gap={{ base: 1.5, md: 2 }}
                  flexWrap="wrap"
                  align={{ base: "flex-start", md: "center" }}
                >
                  {features.map((feature, index) => (
                    <Badge
                      key={index}
                      colorPalette="purple"
                      variant="subtle"
                      size={{ base: "sm", md: "sm" }}
                    >
                      <HStack gap={1} flexWrap="wrap">
                        <Text fontSize="xs">{feature.icon}</Text>
                        <Text fontSize="xs">{feature.label}</Text>
                        {feature.optional && (
                          <Text fontSize="2xs" opacity={0.7}>
                            (Optional)
                          </Text>
                        )}
                      </HStack>
                    </Badge>
                  ))}
                </HStack>
              </Box>
            )}
          </VStack>
        </CustomContainer>
      </Box>
    </motion.div>
  );
}

export default QuestionCard;
