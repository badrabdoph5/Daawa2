import { KeyRound, UserCheck, UserPlus, UsersRound } from "lucide-react";
import { StatsGrid } from "@/components/StatsGrid";
import { getAdminCustomers } from "@/lib/admin-data";

export default async function CustomersPage() {
  const customers = await getAdminCustomers();
  const activeCustomers = customers.filter((customer) => customer.isActive).length;
  const totalInvitations = customers.reduce((sum, customer) => sum + customer.invitations, 0);

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Customers</span>
          <h1>العملاء وبيانات الدخول</h1>
        </div>
        <button className="btn btn-gold" type="button">
          <UserPlus size={18} />
          عميل جديد
        </button>
      </div>
      <StatsGrid
        stats={[
          { label: "إجمالي العملاء", value: customers.length, hint: "متزامن من حسابات الدعوات المنشأة" },
          { label: "عملاء نشطين", value: activeCustomers, hint: "الحسابات المتاحة للدخول" },
          { label: "دعوات مرتبطة", value: totalInvitations, hint: "عدد الدعوات المملوكة للعملاء" },
        ]}
      />
      <div className="customer-sync-note">
        <UsersRound size={18} />
        <span>أي دعوة جديدة من الأدمن أو تحويل طلب لدعوة بتنشئ/تحدث حساب العميل هنا تلقائيًا.</span>
        <strong>
          <UserCheck size={15} />
          متزامن
        </strong>
      </div>
      <div className="table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th>العميل</th>
              <th>الهاتف</th>
              <th>اسم الدخول</th>
              <th>عدد الدعوات</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.username}>
                <td>{customer.name}</td>
                <td>{customer.phone}</td>
                <td>{customer.username}</td>
                <td>{customer.invitations}</td>
                <td>
                  <span className={customer.isActive ? "status success" : "status danger"}>{customer.isActive ? "نشط" : "متوقف"}</span>
                </td>
                <td>
                  <button className="btn btn-soft" type="button">
                    <KeyRound size={17} />
                    Reset Password
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
