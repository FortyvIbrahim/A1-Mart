import { getRestDayBadgeValue } from "@/utils/restDayBadges";
import { getEmployeeCategoryBadgeValue } from "@/utils/employeeCategoryBadges";

export const employeeColDefs = ({
  allowAdd,
  allowMFAToggle,
  removeEmployeeLogin,
  handleRemove2FA,
  showActions = true,
} = {}) => {
  const baseCols = [
    {
      field: "employee_code",
      headerName: "ID",
      type: "id",
    },
    {
      field: "profile_img_url",
      headerName: "Image",
      type: "avatar",
      avatarSize: 40,
    },
    {
      field: "employee_name",
      headerName: "Name",
      type: "capitalize",
    },
    {
      field: "buyer_alias",
      headerName: "Buyer Alias",
      type: "capitalize",
      hideByDefault: true,
    },
    {
      field: "designation_name",
      headerName: "Designation",
      type: "capitalize",
    },
    {
      field: "mobile_number",
      headerName: "Mobile",
      type: "capitalize",
    },
    {
      field: "branch_name",
      headerName: "Branch",
      type: "capitalize",
    },
    {
      field: "rest_day",
      headerName: "Rest day",
      type: "badge-column",
      valueGetter: (props) => getRestDayBadgeValue(props.data?.rest_day),
    },
    {
      field: "department_name",
      headerName: "Department",
      type: "capitalize",
      hideByDefault: true,
    },
    {
      field: "section_name",
      headerName: "Section",
      type: "capitalize",
      hideByDefault: true,
    },
    {
      field: "account_no",
      headerName: "Account No",
      hideByDefault: true,
    },
    {
      field: "ifsc_code",
      headerName: "IFSC Code",
      hideByDefault: true,
    },
    {
      field: "religion",
      headerName: "Religion",
      type: "new-capitalized",
      hideByDefault: true,
    },
    {
      field: "employee_category",
      headerName: "Category",
      type: "badge-column",
      hideByDefault: true,
      valueGetter: (props) =>
        getEmployeeCategoryBadgeValue(props.data?.employee_category),
    },
    {
      field: "gender",
      headerName: "Gender",
      cellRenderer: (props) => {
        const genderMap = {
          M: "Male",
          F: "Female",
          O: "Other",
        };

        return genderMap[props.value] || "-";
      },
      hideByDefault: true,
    },
    {
      field: "user_id",
      headerName: "Account Status",
      hideByDefault: true,
      type: "badge-column",
      valueGetter: (props) => {
        const notCreated =
          props.data.user_id === null || props.data.user_id === undefined;

        return {
          label: notCreated ? "Pending" : "Registered",
          colorScheme: notCreated ? "gray" : "secondary",
        };
      },
    },
    {
      field: "totp_enabled",
      headerName: "2FA Status",
      type: "badge-column",
      hideByDefault: true,
      valueGetter: (props) => {
        const isSetupDone = props.data.totp_status === "setup-done";
        const isEnabled =
          props.data.totp_enabled === 1 || props.data.totp_enabled === true;

        if (!isSetupDone) {
          return {
            colorScheme: "gray",
            label: "Not Setup",
          };
        }
        return {
          colorScheme: isEnabled ? "green" : "red",
          label: isEnabled ? "Enabled" : "Disabled",
        };
      },
    },
    {
      field: "terminated",
      headerName: "Status",
      type: "badge-column",
      hideByDefault: true,
      valueGetter: (props) => {
        const isActive = props.data.terminated === 0;
        return {
          label: isActive ? "Active" : "Terminated",
          colorScheme: isActive ? "green" : "red",
        };
      },
    },
  ];

  if (!showActions) {
    return baseCols;
  }

  return [
    ...baseCols,
    {
      field: "employee_code",
      headerName: "Action",
      type: "action-column",
      valueGetter: (props) => {
        const menu = [
          {
            label: "View",
            value: "view",
            redirectionUrl: `/employees/view/${props.data.employee_code}`,
          },
        ];
        const isSetupDone = props.data.totp_status === "setup-done";
        const notCreated =
          props.data.user_id === null || props.data.user_id === undefined;

        if (allowAdd) {
          menu.push({
            label: "Edit",
            value: "edit",
            redirectionUrl: `/employees/edit/${props.data.employee_code}`,
          });
        }

        if (!notCreated && removeEmployeeLogin) {
          menu.push({
            label: "Reset Login",
            value: "removeLogin",
            onClick: () => removeEmployeeLogin(props.data.employee_code),
            type: "danger",
          });
        }

        if (!allowMFAToggle || !isSetupDone || !handleRemove2FA) {
          return menu;
        }

        menu.push({
          label: "Remove 2FA",
          value: "remove2FA",
          onClick: () => handleRemove2FA(props.data.employee_code),
          type: "danger",
        });

        return menu;
      },
    },
  ];
};
