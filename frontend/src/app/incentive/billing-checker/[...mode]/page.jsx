import IncentiveCommonForm from "@/components/IncentiveCommon/IncentiveCommonForm";

export default function BillingCheckerForm({ params }) {
  return (
    <IncentiveCommonForm
      params={params}
      type="billing-checker"
      basePath="/incentive/billing-checker"
      title="Billing Checker Incentive"
      permissionKey="add_billing_checker_incentive"
      showClusterSelection
    />
  );
}
