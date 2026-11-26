import IncentiveCommonList from "@/components/IncentiveCommon/IncentiveCommonList";

export default function BillingCheckerIncentive() {
  return (
    <IncentiveCommonList
      type="billing-checker"
      basePath="/incentive/billing-checker"
      title="Billing Checker Incentive"
      permissionKey="view_billing_checker_incentive"
      showClusterSelection
    />
  );
}
