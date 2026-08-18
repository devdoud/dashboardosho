export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
      orders: { Row: Order; Insert: OrderInsert; Update: OrderUpdate; Relationships: [] }
      order_items: { Row: OrderItem; Insert: OrderItemInsert; Update: OrderItemUpdate; Relationships: [] }
      order_assignments: { Row: OrderAssignment; Insert: OrderAssignmentInsert; Update: OrderAssignmentUpdate; Relationships: [] }
      payment_attempts: { Row: PaymentAttempt; Insert: PaymentAttemptInsert; Update: PaymentAttemptUpdate; Relationships: [] }
      products: {
        Row: Product
        Insert: ProductInsert
        Update: ProductUpdate
        Relationships: [{
          foreignKeyName: 'products_category_id_fkey'
          columns: ['category_id']
          isOneToOne: false
          referencedRelation: 'categories'
          referencedColumns: ['id']
        }]
      }
      categories: { Row: Category; Insert: CategoryInsert; Update: CategoryUpdate; Relationships: [] }
      addresses: { Row: Address; Insert: AddressInsert; Update: AddressUpdate; Relationships: [] }
      measurement_profiles: { Row: MeasurementProfile; Insert: MeasurementProfileInsert; Update: MeasurementProfileUpdate; Relationships: [] }
      measurement_tutorials: { Row: MeasurementTutorial; Insert: MeasurementTutorialInsert; Update: MeasurementTutorialUpdate; Relationships: [] }
      tailor_reviews: { Row: TailorReview; Insert: TailorReviewInsert; Update: TailorReviewUpdate; Relationships: [] }
      user_roles: { Row: UserRole; Insert: UserRoleInsert; Update: UserRoleUpdate; Relationships: [] }
      fcm_tokens: { Row: FcmToken; Insert: FcmTokenInsert; Update: FcmTokenUpdate; Relationships: [] }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

// ─── Helpers de charge utile ──────────────────────────────────────────────────

/** Clés dont le type accepte `null` : colonnes facultatives à l'insertion. */
type NullableKeys<T> = { [K in keyof T]-?: null extends T[K] ? K : never }[keyof T]

/**
 * Charge utile d'insertion : les colonnes générées par la base sont omises,
 * les colonnes nullables deviennent facultatives.
 */
export type Insertable<Row, Generated extends keyof Row> =
  Omit<Row, Generated | NullableKeys<Row>> &
  Partial<Pick<Row, Exclude<NullableKeys<Row>, Generated>>>

/** Charge utile de mise à jour : toutes les colonnes sont facultatives. */
export type Updatable<Row> = Partial<Row>

// ─── Orders ───────────────────────────────────────────────────────────────────

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type PaymentMethod = 'card' | 'mobile_money'

export type ShippingAddress = {
  full_name: string
  phone: string
  address: string
  city: string
  quartier: string
  country: string
  postal_code?: string
}

export type Order = {
  id: string
  user_id: string
  status: OrderStatus
  total_amount: number
  payment_status: PaymentStatus
  payment_method: PaymentMethod | null
  shipping_address: ShippingAddress | null
  customer_note: string | null   // Note laissée par le client à la commande
  paid_at: string | null
  stripe_payment_intent_id: string | null
  primary_tailor_id: string | null
  customer_confirmed: boolean | null
  customer_received_at: string | null
  tax_amount: number | null
  tax_rate: number | null
  tax_label: string | null
  created_at: string
  updated_at: string
}

export type OrderInsert = Insertable<Order, 'id' | 'created_at' | 'updated_at'>
export type OrderUpdate = Updatable<Order>

// ─── Order Items ──────────────────────────────────────────────────────────────

export type CustomizationDetails = {
  tissu?: string
  broderie?: string
  finition?: string
  [key: string]: unknown
}

export type OrderItem = {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  measurement_profile_id: string | null
  customization_details: CustomizationDetails | null
  configuration_snapshot: Json | null
  measurements_snapshot: Json | null
}

export type OrderItemInsert = Insertable<OrderItem, 'id'>
export type OrderItemUpdate = Updatable<OrderItem>

// ─── Order Assignments ────────────────────────────────────────────────────────

export type AssignmentStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'rejected' | 'cancelled'

export type OrderAssignment = {
  id: string
  order_id: string
  tailor_id: string
  status: AssignmentStatus
  assigned_at: string
  accepted_at: string | null
  started_at: string | null
  completed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type OrderAssignmentInsert = Insertable<OrderAssignment, 'id' | 'created_at' | 'updated_at'>
export type OrderAssignmentUpdate = Updatable<OrderAssignment>

// ─── Payment Attempts ─────────────────────────────────────────────────────────

export type PaymentAttemptStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled'
export type Currency = 'xof' | 'usd'

export type PaymentAttempt = {
  id: string
  user_id: string
  stripe_payment_intent_id: string
  amount: number
  currency: Currency
  status: PaymentAttemptStatus
  order_payload: Json | null
  order_id: string | null
  paid_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export type PaymentAttemptInsert = Insertable<PaymentAttempt, 'id' | 'created_at' | 'updated_at'>
export type PaymentAttemptUpdate = Updatable<PaymentAttempt>

// ─── Products ─────────────────────────────────────────────────────────────────

export type ProductDifficulty = 'easy' | 'medium' | 'hard'

export type FabricOption = {
  name: string
  image_url: string
}

/** Valeur textuelle bilingue (FR/EN) stockée en JSON */
export type I18nText = {
  fr: string
  en: string
}

export type Product = {
  id: string
  name: string
  price: number
  thumbnail: string | null
  images: string[] | null
  description: string | null
  sku: string
  category_id: string | null
  is_featured: boolean | null
  fabric: string | null
  embroidery: string | null
  accessory: string | null
  tags: I18nText[] | null
  fabric_options: FabricOption[] | null
  embroidery_options: FabricOption[] | null
  finish_options: FabricOption[] | null
  perfect_for: I18nText[] | null
  is_traditional: boolean | null
  traditional_origin: string | null
  difficulty: ProductDifficulty | null
  estimated_days: number | null
  created_at: string
}

export type ProductInsert = Insertable<Product, 'id' | 'created_at'>
export type ProductUpdate = Updatable<Product>

// ─── Categories ───────────────────────────────────────────────────────────────

export type CategoryType = 'homme' | 'femme' | 'enfant'
export type CategoryStyle = 'traditionnel' | 'moderne' | 'mixte'

export type Category = {
  id: string
  name: string
  slug: string
  type: CategoryType
  style: CategoryStyle
  image: string | null
  created_at: string
}

export type CategoryInsert = Insertable<Category, 'id' | 'created_at'>
export type CategoryUpdate = Updatable<Category>

// ─── Addresses ────────────────────────────────────────────────────────────────

export type Address = {
  id: string
  user_id: string
  full_name: string
  phone: string
  address: string
  city: string
  quartier: string | null
  postal_code: string | null
  country: string
  is_default: boolean
  created_at: string
}

export type AddressInsert = Insertable<Address, 'id' | 'created_at'>
export type AddressUpdate = Updatable<Address>

// ─── Measurement Profiles ─────────────────────────────────────────────────────

export type Gender = 'homme' | 'femme'

export type MeasurementProfile = {
  id: string
  user_id: string
  profile_name: string
  is_primary: boolean
  gender: Gender
  height: number | null
  weight: number | null
  chest: number | null
  waist: number | null
  hips: number | null
  shoulder: number | null
  sleeve: number | null
  inseam: number | null
  neck: number | null
  upper_arm: number | null
  back_length: number | null
  dress_length: number | null
  thigh: number | null
  trouser_length: number | null
  bust_height: number | null
  created_at: string
}

export type MeasurementProfileInsert = Insertable<MeasurementProfile, 'id' | 'created_at'>
export type MeasurementProfileUpdate = Updatable<MeasurementProfile>

// ─── Measurement Tutorials ────────────────────────────────────────────────────

export type MeasurementTutorial = {
  id: string
  slug: string
  title: string
  description: string | null
  video_path: string | null
  thumbnail_path: string | null
  sort_order: number | null
  is_active: boolean
  created_at: string
}

export type MeasurementTutorialInsert = Insertable<MeasurementTutorial, 'id' | 'created_at'>
export type MeasurementTutorialUpdate = Updatable<MeasurementTutorial>

// ─── Tailor Reviews ───────────────────────────────────────────────────────────

export type TailorReview = {
  id: string
  order_id: string
  tailor_id: string
  customer_id: string
  rating: number
  review_text: string | null
  created_at: string
}

export type TailorReviewInsert = Insertable<TailorReview, 'id' | 'created_at'>
export type TailorReviewUpdate = Updatable<TailorReview>

// ─── User Roles ───────────────────────────────────────────────────────────────

export type UserRoleType = 'admin' | 'tailor' | 'customer'

export type UserRole = {
  id: string
  user_id: string
  role: UserRoleType
  created_at: string
}

export type UserRoleInsert = Insertable<UserRole, 'id' | 'created_at'>
export type UserRoleUpdate = Updatable<UserRole>

// ─── FCM Tokens ───────────────────────────────────────────────────────────────

export type FcmPlatform = 'android' | 'ios'

export type FcmToken = {
  id: string
  user_id: string
  token: string
  platform: FcmPlatform | null
  created_at: string
  updated_at: string
}

export type FcmTokenInsert = Insertable<FcmToken, 'id' | 'created_at' | 'updated_at'>
export type FcmTokenUpdate = Updatable<FcmToken>

// ─── Notification payload ─────────────────────────────────────────────────────

export type NotificationPayload = {
  user_id: string
  title: string
  body: string
  data?: Record<string, string>
}

export type NotificationTarget = 'user' | 'all_customers' | 'all_tailors' | 'all_users'

// ─── Extended types with joins ────────────────────────────────────────────────

export type OrderWithItems = Order & {
  order_items: (OrderItem & { product: Pick<Product, 'id' | 'name' | 'thumbnail' | 'sku'> | null })[]
  user?: { id: string; email?: string }
}

export type OrderWithAssignment = Order & {
  order_assignments: OrderAssignment[]
}

export type ProductWithCategory = Product & {
  category: Category | null
}

export type ReviewWithDetails = TailorReview & {
  tailor?: { id: string; email?: string }
  customer?: { id: string; email?: string }
  order?: Pick<Order, 'id' | 'total_amount' | 'created_at'>
}
