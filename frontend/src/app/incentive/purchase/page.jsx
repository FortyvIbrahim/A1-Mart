import IncentiveCommonList from "@/components/IncentiveCommon/IncentiveCommonList";

export default function PurchaseIncentive() {
  return (
    <IncentiveCommonList
      type="purchase"
      basePath="/incentive/purchase"
      title="Purchase Incentive"
      permissionKey="view_purchase_incentive"
    />
  );
}