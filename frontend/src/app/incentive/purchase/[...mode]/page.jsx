import IncentiveCommonForm from "@/components/IncentiveCommon/IncentiveCommonForm";

export default function PurchaseForm({ params }) {
    return (
        <IncentiveCommonForm
            params={params}
            type="purchase"
            basePath="/incentive/purchase"
            title="Purchase Incentive"
            permissionKey="add_purchase_incentive"
        />
    );
}