import IncentiveCommonForm from "@/components/IncentiveCommon/IncentiveCommonForm";

export default function PurchaseDataEntryForm({ params }) {
    return (
        <IncentiveCommonForm
            params={params}
            type="purchase-data-entry"
            basePath="/incentive/purchase-data-entry"
            title="Purchase Data Entry"
            permissionKey="add_purchase_data_entry_incentive"
        />
    );
}