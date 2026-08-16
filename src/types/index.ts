export type RestaurantStatus = "active" | "inactive" | "pending";

export type Restaurant = {
  id: string;
  name: string;
  slug: string;
  status: RestaurantStatus;
  city?: string;
  createdAt: string;
};

export type OrderStatus =
  | "Pending"
  | "Accepted"
  | "Preparing"
  | "Ready"
  | "Assigned"
  | "Picked Up"
  | "Out for Delivery"
  | "Delivered"
  | "Rejected"
  | "customer_not_available"
  | "cancelled";

export type Order = {
  id: string;
  restaurantId: string;
  customerName: string;
  total: number;
  currency: string;
  status: OrderStatus;
  createdAt: string;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "superadmin" | "admin" | "support";
  createdAt: string;
};
