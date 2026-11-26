import IncentiveCommonList from "@/components/IncentiveCommon/IncentiveCommonList";

export default function PickAndPackIncentive() {
  return (
    <IncentiveCommonList
      type="pick-and-pack"
      basePath="/incentive/pick-and-pack"
      title="Pick and Pack Incentive"
      permissionKey="view_pick_and_pack_incentive"
    />
  );
}