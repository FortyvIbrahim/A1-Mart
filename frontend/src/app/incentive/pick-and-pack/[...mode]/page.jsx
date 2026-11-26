import IncentiveCommonForm from "@/components/IncentiveCommon/IncentiveCommonForm";

export default function PickAndPackForm({ params }) {
    return (
        <IncentiveCommonForm
            params={params}
            type="pick-and-pack"
            basePath="/incentive/pick-and-pack"
            title="Pick and Pack Incentive"
            permissionKey="add_pick_and_pack_incentive"
        />
    );
}