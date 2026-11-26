import IncentiveCommonList from "@/components/IncentiveCommon/IncentiveCommonList";

export default function GRNIncentive() {
  return (
    <IncentiveCommonList
      type="grn"
      basePath="/incentive/grn"
      title="GRN Incentive"
      permissionKey="view_grn_incentive"
    />
  );
}