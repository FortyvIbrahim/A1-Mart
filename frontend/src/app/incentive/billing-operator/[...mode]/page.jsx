import IncentiveCommonForm from "@/components/IncentiveCommon/IncentiveCommonForm";

export default function BillingOperatorForm({ params }) {
  return (
    <IncentiveCommonForm
      params={params}
      type="billing-operator"
      basePath="/incentive/billing-operator"
      title="Billing Operator Incentive"
      permissionKey="add_billing_operator_incentive"
      showClusterSelection
    />
  );
}
