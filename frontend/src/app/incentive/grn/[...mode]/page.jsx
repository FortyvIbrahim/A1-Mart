import IncentiveCommonForm from "@/components/IncentiveCommon/IncentiveCommonForm";

export default function GRNForm({ params }) {
    return (
        <IncentiveCommonForm
            params={params}
            type="grn"
            basePath="/incentive/grn"
            title="GRN Incentive"
            permissionKey="add_grn_incentive"
        />
    );
}