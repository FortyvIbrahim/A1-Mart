import IncentiveCommonList from "@/components/IncentiveCommon/IncentiveCommonList";

export default function PurchaseDataEntry() {
  return (
    <IncentiveCommonList
      type="purchase-data-entry"
      basePath="/incentive/purchase-data-entry"
      title="Purchase Data Entry"
      permissionKey="view_purchase_data_entry_incentive"
    />
  );
}