"use client";

import CustomContainer from "@/components/CustomContainer";
import GlobalWrapper from "@/components/GlobalWrapper";
import { Box, Flex, Grid, Heading, Text, VStack } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { REPORT_CATEGORIES } from "./reportData";

function MaterialsReport() {
  const router = useRouter();

  return (
    <GlobalWrapper permissionKey="view_materials_report">
      <CustomContainer title="Materials Reports">
        <VStack gap="22px" align="stretch">
          {REPORT_CATEGORIES.map((category, categoryIndex) => (
            <CustomContainer
              key={categoryIndex}
              title={category.title}
              size="md"
              color="secondary"
            >
              <VStack gap={4} align="stretch">
                <Text fontSize="sm" color="gray.600">
                  {category.description}
                </Text>
                <Grid
                  templateColumns={{
                    base: "1fr",
                    md: "repeat(2, 1fr)",
                    lg: "repeat(3, 1fr)",
                  }}
                  gap={4}
                >
                  {category.reports.map((report) => (
                    <Box
                      key={report.id}
                      p={4}
                      border="1px solid"
                      borderColor="gray.200"
                      borderRadius="md"
                      bg="white"
                      cursor="pointer"
                      onClick={() => {
                        router.push(`/materials/report/${report.id}`);
                      }}
                      _hover={{
                        boxShadow: "lg",
                        transform: "translateY(-2px)",
                        transition: "all 0.2s",
                        borderColor: "brand.400",
                      }}
                    >
                      <VStack align="stretch" spacing={3}>
                        <Heading size="sm" color="brand.600">
                          {report.name}
                        </Heading>
                        <Text fontSize="xs" color="gray.600">
                          {report.description}
                        </Text>
                        <Box>
                          <Text
                            fontSize="xs"
                            fontWeight="semibold"
                            color="gray.700"
                            mb={1}
                          >
                            Data Points:
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            {report.dataPoints.join(", ")}
                          </Text>
                        </Box>
                        {report.filters && report.filters.length > 0 && (
                          <Box>
                            <Text
                              fontSize="xs"
                              fontWeight="semibold"
                              color="gray.700"
                              mb={1}
                            >
                              Available Filters:
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {report.filters.join(", ")}
                            </Text>
                          </Box>
                        )}
                      </VStack>
                    </Box>
                  ))}
                </Grid>
              </VStack>
            </CustomContainer>
          ))}
        </VStack>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default MaterialsReport;
