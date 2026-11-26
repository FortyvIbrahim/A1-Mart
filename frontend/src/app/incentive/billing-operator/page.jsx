import IncentiveCommonList from "@/components/IncentiveCommon/IncentiveCommonList";

export default function BillingOperatorIncentive() {
  return (
    <IncentiveCommonList
      type="billing-operator"
      basePath="/incentive/billing-operator"
      title="Billing Operator Incentive"
      permissionKey="view_billing_operator_incentive"
      showClusterSelection
    />
  );
}
