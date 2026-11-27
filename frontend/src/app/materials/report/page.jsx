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
      <CustomContainer headerBand title="Materials Reports">
        <VStack gap="28px" align="stretch">
          {REPORT_CATEGORIES.map((category, categoryIndex) => (
            <Flex key={categoryIndex} direction="column" gap="14px">
              <Box>
                {category.title !== "Materials Reports" && (
                  <Heading
                    size="md"
                    fontSize="16px"
                    lineHeight="22px"
                    fontWeight="600"
                    color="fg"
                    mb="4px"
                  >
                    {category.title}
                  </Heading>
                )}
                <Text fontSize="13px" color="fg.muted">
                  {category.description}
                </Text>
              </Box>

              <Grid
                templateColumns={{
                  base: "1fr",
                  md: "repeat(2, 1fr)",
                }}
                gap="18px"
              >
                {category.reports.map((report) => (
                  <Box
                    key={report.id}
                    p="20px"
                    borderWidth="1px"
                    borderColor="border"
                    borderRadius="12px"
                    bg="white"
                    cursor="pointer"
                    transition="all 0.18s ease"
                    onClick={() => {
                      router.push(`/materials/report/${report.id}`);
                    }}
                    _hover={{
                      bg: "#FFFBF8",
                      borderColor: "#F47721",
                      transform: "translateY(-1px)",
                    }}
                  >
                    <VStack align="stretch" gap="10px">
                      <Heading
                        fontSize="15px"
                        lineHeight="20px"
                        fontWeight="600"
                        color="#C95C18"
                      >
                        {report.name}
                      </Heading>
                      <Text fontSize="12.5px" color="fg.muted" lineHeight="18px">
                        {report.description}
                      </Text>
                      <Box>
                        <Text
                          fontSize="12px"
                          fontWeight="600"
                          color="fg"
                          mb="2px"
                        >
                          Data Points:
                        </Text>
                        <Text fontSize="12px" color="fg.muted" lineHeight="17px">
                          {report.dataPoints.join(", ")}
                        </Text>
                      </Box>
                      {report.filters && report.filters.length > 0 && (
                        <Box>
                          <Text
                            fontSize="12px"
                            fontWeight="600"
                            color="fg"
                            mb="2px"
                          >
                            Available Filters:
                          </Text>
                          <Text fontSize="12px" color="fg.muted" lineHeight="17px">
                            {report.filters.join(", ")}
                          </Text>
                        </Box>
                      )}
                    </VStack>
                  </Box>
                ))}
              </Grid>
            </Flex>
          ))}
        </VStack>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default MaterialsReport;
