import { z } from "zod";

// Generated schemas for component types
// This file is auto-generated - do not edit manually

export const ActionApiContentSchema = z.object({
  presentModal: z.function(),
});

export const CartApiContentSchema = z.object({
  addAddress: z.function(),
  addCartCodeDiscount: z.function(),
  addCartProperties: z.function(),
  addCustomSale: z.function(),
  addLineItem: z.function(),
  addLineItemProperties: z.function(),
  applyCartDiscount: z.function(),
  bulkAddLineItemProperties: z.function(),
  bulkCartUpdate: z.function(),
  bulkSetLineItemDiscounts: z.function(),
  clearCart: z.function(),
  deleteAddress: z.function(),
  removeAllDiscounts: z.function(),
  removeCartDiscount: z.function(),
  removeCartProperties: z.function(),
  removeCustomer: z.function(),
  removeLineItem: z.function(),
  removeLineItemDiscount: z.function(),
  removeLineItemProperties: z.function(),
  setAttributedStaff: z.function(),
  setAttributedStaffToLineItem: z.function(),
  setCustomer: z.function(),
  setLineItemDiscount: z.function(),
  subscribable: z.string(),
  updateDefaultAddress: z.function(),
});

export const AddressSchema = z.object({
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  company: z.string().optional(),
  country: z.string().optional(),
  countryCode: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  province: z.string().optional(),
  provinceCode: z.string().optional(),
  zip: z.string().optional(),
});

export const CountryCodeSchema = z.object({
  AF: z.string(),
  AX: z.string(),
  AL: z.string(),
  DZ: z.string(),
  AD: z.string(),
  AO: z.string(),
  AI: z.string(),
  AG: z.string(),
  AR: z.string(),
  AM: z.string(),
  AW: z.string(),
  AC: z.string(),
  AU: z.string(),
  AT: z.string(),
  AZ: z.string(),
  BS: z.string(),
  BH: z.string(),
  BD: z.string(),
  BB: z.string(),
  BY: z.string(),
  BE: z.string(),
  BZ: z.string(),
  BJ: z.string(),
  BM: z.string(),
  BT: z.string(),
  BO: z.string(),
  BA: z.string(),
  BW: z.string(),
  BV: z.string(),
  BR: z.string(),
  IO: z.string(),
  BN: z.string(),
  BG: z.string(),
  BF: z.string(),
  BI: z.string(),
  KH: z.string(),
  CA: z.string(),
  CV: z.string(),
  BQ: z.string(),
  KY: z.string(),
  CF: z.string(),
  TD: z.string(),
  CL: z.string(),
  CN: z.string(),
  CX: z.string(),
  CC: z.string(),
  CO: z.string(),
  KM: z.string(),
  CG: z.string(),
  CD: z.string(),
  CK: z.string(),
  CR: z.string(),
  HR: z.string(),
  CU: z.string(),
  CW: z.string(),
  CY: z.string(),
  CZ: z.string(),
  CI: z.string(),
  DK: z.string(),
  DJ: z.string(),
  DM: z.string(),
  DO: z.string(),
  EC: z.string(),
  EG: z.string(),
  SV: z.string(),
  GQ: z.string(),
  ER: z.string(),
  EE: z.string(),
  SZ: z.string(),
  ET: z.string(),
  FK: z.string(),
  FO: z.string(),
  FJ: z.string(),
  FI: z.string(),
  FR: z.string(),
  GF: z.string(),
  PF: z.string(),
  TF: z.string(),
  GA: z.string(),
  GM: z.string(),
  GE: z.string(),
  DE: z.string(),
  GH: z.string(),
  GI: z.string(),
  GR: z.string(),
  GL: z.string(),
  GD: z.string(),
  GP: z.string(),
  GT: z.string(),
  GG: z.string(),
  GN: z.string(),
  GW: z.string(),
  GY: z.string(),
  HT: z.string(),
  HM: z.string(),
  VA: z.string(),
  HN: z.string(),
  HK: z.string(),
  HU: z.string(),
  IS: z.string(),
  IN: z.string(),
  ID: z.string(),
  IR: z.string(),
  IQ: z.string(),
  IE: z.string(),
  IM: z.string(),
  IL: z.string(),
  IT: z.string(),
  JM: z.string(),
  JP: z.string(),
  JE: z.string(),
  JO: z.string(),
  KZ: z.string(),
  KE: z.string(),
  KI: z.string(),
  KP: z.string(),
  XK: z.string(),
  KW: z.string(),
  KG: z.string(),
  LA: z.string(),
  LV: z.string(),
  LB: z.string(),
  LS: z.string(),
  LR: z.string(),
  LY: z.string(),
  LI: z.string(),
  LT: z.string(),
  LU: z.string(),
  MO: z.string(),
  MG: z.string(),
  MW: z.string(),
  MY: z.string(),
  MV: z.string(),
  ML: z.string(),
  MT: z.string(),
  MQ: z.string(),
  MR: z.string(),
  MU: z.string(),
  YT: z.string(),
  MX: z.string(),
  MD: z.string(),
  MC: z.string(),
  MN: z.string(),
  ME: z.string(),
  MS: z.string(),
  MA: z.string(),
  MZ: z.string(),
  MM: z.string(),
  NA: z.string(),
  NR: z.string(),
  NP: z.string(),
  NL: z.string(),
  AN: z.string(),
  NC: z.string(),
  NZ: z.string(),
  NI: z.string(),
  NE: z.string(),
  NG: z.string(),
  NU: z.string(),
  NF: z.string(),
  MK: z.string(),
  NO: z.string(),
  OM: z.string(),
  PK: z.string(),
  PS: z.string(),
  PA: z.string(),
  PG: z.string(),
  PY: z.string(),
  PE: z.string(),
  PH: z.string(),
  PN: z.string(),
  PL: z.string(),
  PT: z.string(),
  QA: z.string(),
  CM: z.string(),
  RE: z.string(),
  RO: z.string(),
  RU: z.string(),
  RW: z.string(),
  BL: z.string(),
  SH: z.string(),
  KN: z.string(),
  LC: z.string(),
  MF: z.string(),
  PM: z.string(),
  WS: z.string(),
  SM: z.string(),
  ST: z.string(),
  SA: z.string(),
  SN: z.string(),
  RS: z.string(),
  SC: z.string(),
  SL: z.string(),
  SG: z.string(),
  SX: z.string(),
  SK: z.string(),
  SI: z.string(),
  SB: z.string(),
  SO: z.string(),
  ZA: z.string(),
  GS: z.string(),
  KR: z.string(),
  SS: z.string(),
  ES: z.string(),
  LK: z.string(),
  VC: z.string(),
  SD: z.string(),
  SR: z.string(),
  SJ: z.string(),
  SE: z.string(),
  CH: z.string(),
  SY: z.string(),
  TW: z.string(),
  TJ: z.string(),
  TZ: z.string(),
  TH: z.string(),
  TL: z.string(),
  TG: z.string(),
  TK: z.string(),
  TO: z.string(),
  TT: z.string(),
  TA: z.string(),
  TN: z.string(),
  TR: z.string(),
  TM: z.string(),
  TC: z.string(),
  TV: z.string(),
  UG: z.string(),
  UA: z.string(),
  AE: z.string(),
  GB: z.string(),
  US: z.string(),
  UM: z.string(),
  UY: z.string(),
  UZ: z.string(),
  VU: z.string(),
  VE: z.string(),
  VN: z.string(),
  VG: z.string(),
  WF: z.string(),
  EH: z.string(),
  YE: z.string(),
  ZM: z.string(),
  ZW: z.string(),
  ZZ: z.string(),
});

export const CustomSaleSchema = z.object({
  price: z.string(),
  quantity: z.number(),
  taxable: z.boolean(),
  title: z.string(),
});

export const SetLineItemPropertiesInputSchema = z.object({
  lineItemUuid: z.string(),
  properties: z.string(),
});

export const CartUpdateInputSchema = z.object({
  cartDiscount: z.string().optional(),
  cartDiscounts: z.string(),
  customer: z.string().optional(),
  lineItems: z.string(),
  note: z.string().optional(),
  properties: z.string(),
});

export const DiscountSchema = z.object({
  amount: z.number(),
  currency: z.string().optional(),
  discountDescription: z.string().optional(),
  type: z.string().optional(),
});

export const CustomerSchema = z.object({
  id: z.number(),
});

export const LineItemSchema = z.object({
  attributedUserId: z.number().optional(),
  discounts: z.string(),
  isGiftCard: z.boolean(),
  price: z.number().optional(),
  productId: z.number().optional(),
  properties: z.string(),
  quantity: z.number(),
  sku: z.string().optional(),
  taxable: z.boolean(),
  taxLines: z.string(),
  title: z.string().optional(),
  uuid: z.string(),
  variantId: z.number().optional(),
  vendor: z.string().optional(),
});

export const TaxLineSchema = z.object({
  enabled: z.boolean().optional(),
  price: z.string(),
  rate: z.number(),
  rateRange: z.string().optional(),
  title: z.string(),
  uuid: z.string().optional(),
});

export const MoneySchema = z.object({
  amount: z.number(),
  currency: z.string(),
});

export const CartSchema = z.object({
  cartDiscount: z.string().optional(),
  cartDiscounts: z.string(),
  customer: z.string().optional(),
  editable: z.boolean().optional(),
  grandTotal: z.string(),
  lineItems: z.string(),
  note: z.string().optional(),
  properties: z.string(),
  subtotal: z.string(),
  taxTotal: z.string(),
});

export const SetLineItemDiscountInputSchema = z.object({
  lineItemDiscount: z.string(),
  lineItemUuid: z.string(),
});

export const LineItemDiscountSchema = z.object({
  amount: z.string(),
  title: z.string(),
  type: z.enum(["Percentage", "FixedAmount"]),
});

export const CartLineItemApiSchema = z.object({
  cartLineItem: z.string(),
});

export const ConnectivityApiContentSchema = z.object({
  subscribable: z.string(),
});

export const ConnectivityStateSchema = z.object({
  internetConnected: z.string(),
});

export const CustomerApiContentSchema = z.object({
  id: z.number(),
});

export const DeviceApiContentSchema = z.object({
  getDeviceId: z.function(),
  isTablet: z.function(),
  name: z.string(),
});

export const DraftOrderApiContentSchema = z.object({
  customerId: z.number().optional(),
  id: z.number(),
  name: z.string(),
});

export const LocaleApiContentSchema = z.object({
  subscribable: z.string(),
});

export const NavigationApiContentSchema = z.object({
  dismiss: z.function(),
  navigate: z.function(),
  pop: z.function(),
});

export const OrderApiContentSchema = z.object({
  customerId: z.number().optional(),
  id: z.number(),
  name: z.string(),
});

export const PrintApiContentSchema = z.object({
  print: z.function(),
});

export const ProductApiContentSchema = z.object({
  id: z.number(),
  variantId: z.number(),
});

export const ProductSearchApiContentSchema = z.object({
  fetchPaginatedProductVariantsWithProductId: z.function(),
  fetchProductsWithIds: z.function(),
  fetchProductVariantsWithIds: z.function(),
  fetchProductVariantsWithProductId: z.function(),
  fetchProductVariantWithId: z.function(),
  fetchProductWithId: z.function(),
  searchProducts: z.function(),
});

export const PaginationParamsSchema = z.object({
  afterCursor: z.string().optional(),
  first: z.number().optional(),
});

export const PaginatedResultSchema = z.object({
  hasNextPage: z.boolean(),
  items: z.string(),
  lastCursor: z.string().optional(),
});

export const ProductVariantSchema = z.object({
  barcode: z.string().optional(),
  compareAtPrice: z.string().optional(),
  createdAt: z.string(),
  displayName: z.string(),
  hasInStockVariants: z.boolean().optional(),
  id: z.number(),
  image: z.string().optional(),
  inventoryAtAllLocations: z.number().optional(),
  inventoryAtLocation: z.number().optional(),
  inventoryIsTracked: z.boolean(),
  inventoryPolicy: z.string(),
  options: z.string().optional(),
  position: z.number(),
  price: z.string(),
  product: z.string().optional(),
  productId: z.number(),
  sku: z.string().optional(),
  taxable: z.boolean(),
  title: z.string(),
  updatedAt: z.string(),
});

export const ProductVariantOptionSchema = z.object({
  name: z.string(),
  value: z.string(),
});

export const ProductSchema = z.object({
  createdAt: z.string(),
  description: z.string(),
  descriptionHtml: z.string(),
  featuredImage: z.string().optional(),
  hasInStockVariants: z.boolean().optional(),
  hasOnlyDefaultVariant: z.boolean(),
  id: z.number(),
  isGiftCard: z.boolean(),
  maxVariantPrice: z.string(),
  minVariantPrice: z.string(),
  numVariants: z.number(),
  onlineStoreUrl: z.string().optional(),
  options: z.string(),
  productCategory: z.string(),
  productType: z.string(),
  tags: z.string(),
  title: z.string(),
  totalAvailableInventory: z.number().optional(),
  totalInventory: z.number(),
  tracksInventory: z.boolean(),
  updatedAt: z.string(),
  variants: z.string(),
  vendor: z.string(),
});

export const ProductOptionSchema = z.object({
  id: z.number(),
  name: z.string(),
  optionValues: z.string(),
  productId: z.number(),
});

export const MultipleResourceResultSchema = z.object({
  fetchedResources: z.string(),
  idsForResourcesNotFound: z.string(),
});

export const ProductSearchParamsSchema = z.object({
  afterCursor: z.string().optional(),
  first: z.number().optional(),
  queryString: z.string().optional(),
  sortType: z.string().optional(),
});

export const ScannerApiContentSchema = z.object({
  scannerDataSubscribable: z.string(),
  scannerSourcesSubscribable: z.string(),
});

export const ScannerSubscriptionResultSchema = z.object({
  data: z.string().optional(),
  source: z.string().optional(),
});

export const SessionApiContentSchema = z.object({
  currentSession: z.string(),
  getSessionToken: z.function(),
});

export const SessionSchema = z.object({
  currency: z.string(),
  locationId: z.number(),
  posVersion: z.string(),
  shopDomain: z.string(),
  shopId: z.number(),
  staffMemberId: z.number().optional(),
  userId: z.number(),
});

export const StorageSchema = z.object({
  clear: z.function(),
  delete: z.function(),
  entries: z.function(),
  get: z.function(),
  set: z.function(),
});

export const ToastApiContentSchema = z.object({
  show: z.function(),
});

export const ShowToastOptionsSchema = z.object({
  duration: z.number().optional(),
});

export const BadgePropsSchema = z.object({
  status: z.string().optional(),
  text: z.string(),
  variant: z.string(),
});

export const BannerPropsSchema = z.object({
  action: z.string().optional(),
  hideAction: z.boolean().optional(),
  onPress: z.function().optional(),
  title: z.string(),
  variant: z.string(),
  visible: z.boolean(),
});

export const BoxPropsSchema = z.object({
  blockSize: z.string().optional(),
  inlineSize: z.string().optional(),
  maxBlockSize: z.string().optional(),
  maxInlineSize: z.string().optional(),
  minBlockSize: z.string().optional(),
  minInlineSize: z.string().optional(),
  padding: z.string().optional(),
  paddingBlock: z.string().optional(),
  paddingBlockEnd: z.string().optional(),
  paddingBlockStart: z.string().optional(),
  paddingInline: z.string().optional(),
  paddingInlineEnd: z.string().optional(),
  paddingInlineStart: z.string().optional(),
});

export const ButtonPropsSchema = z.object({
  isDisabled: z.boolean().optional(),
  isLoading: z.boolean().optional(),
  onPress: z.function().optional(),
  title: z.string().optional(),
  type: z.string().optional(),
});

export const CameraScannerPropsSchema = z.object({
  bannerProps: z.string().optional(),
});

export const CameraScannerBannerPropsSchema = z.object({
  title: z.string(),
  variant: z.string(),
  visible: z.boolean(),
});

export const DateFieldPropsSchema = z.object({
  action: z.string().optional(),
  disabled: z.boolean().optional(),
  error: z.string().optional(),
  helpText: z.string().optional(),
  label: z.string(),
  onBlur: z.function().optional(),
  onChange: z.function().optional(),
  onFocus: z.function().optional(),
  value: z.string().optional(),
});

export const InputActionSchema = z.object({
  disabled: z.boolean().optional(),
  label: z.string(),
  onPress: z.function(),
});

export const DatePickerPropsSchema = z.object({
  inputMode: z.enum(["inline", "spinner"]).optional(),
  onChange: z.function().optional(),
  selected: z.string().optional(),
  visibleState: z.function(),
});

export const DialogPropsSchema = z.object({
  actionText: z.string(),
  content: z.string().optional(),
  isVisible: z.boolean(),
  onAction: z.function(),
  onSecondaryAction: z.function().optional(),
  secondaryActionText: z.string().optional(),
  showSecondaryAction: z.boolean().optional(),
  title: z.string(),
  type: z.string().optional(),
});

export const EmailFieldPropsSchema = z.object({
  action: z.string().optional(),
  disabled: z.boolean().optional(),
  error: z.string().optional(),
  helpText: z.string().optional(),
  label: z.string(),
  maxLength: z.number().optional(),
  onBlur: z.function().optional(),
  onChange: z.function().optional(),
  onFocus: z.function().optional(),
  onInput: z.function().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  value: z.string().optional(),
});

export const IconPropsSchema = z.object({
  name: z.string(),
  size: z.string().optional(),
  tone: z.string().optional(),
});

export const ImagePropsSchema = z.object({
  size: z.string().optional(),
  src: z.string().optional(),
});

export const ListPropsSchema = z.object({
  data: z.string(),
  imageDisplayStrategy: z.enum(["automatic", "always", "never"]).optional(),
  isLoadingMore: z.boolean().optional(),
  listHeaderComponent: z.string().optional(),
  onEndReached: z.function().optional(),
  title: z.string().optional(),
});

export const ListRowSchema = z.object({
  id: z.string(),
  leftSide: z.string(),
  onPress: z.function().optional(),
  rightSide: z.string().optional(),
});

export const ListRowLeftSideSchema = z.object({
  badges: z.string().optional(),
  image: z.string().optional(),
  label: z.string(),
  subtitle: z.string().optional(),
});

export const SubtitleTypeSchema = z.object({
  color: z.string().optional(),
  content: z.string(),
});

export const ListRowRightSideSchema = z.object({
  label: z.string().optional(),
  showChevron: z.boolean().optional(),
  toggleSwitch: z.string().optional(),
});

export const ToggleSwitchSchema = z.object({
  disabled: z.boolean().optional(),
  value: z.boolean().optional(),
});

export const NavigatorPropsSchema = z.object({
  initialScreenName: z.string().optional(),
});

export const NumberFieldPropsSchema = z.object({
  action: z.string().optional(),
  disabled: z.boolean().optional(),
  error: z.string().optional(),
  helpText: z.string().optional(),
  inputMode: z.enum(["decimal", "numeric"]).optional(),
  label: z.string(),
  max: z.number().optional(),
  maxLength: z.number().optional(),
  min: z.number().optional(),
  onBlur: z.function().optional(),
  onChange: z.function().optional(),
  onFocus: z.function().optional(),
  onInput: z.function().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  value: z.string().optional(),
});

export const POSBlockPropsSchema = z.object({
  action: z.function().optional(),
});

export const POSBlockRowPropsSchema = z.object({
  onPress: z.function().optional(),
});

export const PinPadPropsSchema = z.object({
  label: z.string().optional(),
  masked: z.boolean().optional(),
  maxPinLength: z.string().optional(),
  minPinLength: z.string().optional(),
  onPinEntry: z.function().optional(),
  onSubmit: z.function(),
  pinPadAction: z.string().optional(),
});

export const PinPadActionTypeSchema = z.object({
  label: z.string(),
  onPress: z.function(),
});

export const PrintPreviewPropsSchema = z.object({
  src: z.string(),
});

export const QRCodePropsSchema = z.object({
  value: z.string(),
});

export const RadioButtonListPropsSchema = z.object({
  initialOffsetToShowSelectedItem: z.boolean().optional(),
  initialSelectedItem: z.string().optional(),
  items: z.string(),
  onItemSelected: z.function(),
});

export const ScreenPropsSchema = z.object({
  isLoading: z.boolean().optional(),
  name: z.string(),
  onNavigate: z.function().optional(),
  onNavigateBack: z.function().optional(),
  onReceiveParams: z.function().optional(),
  overrideNavigateBack: z.function().optional(),
  presentation: z.string().optional(),
  secondaryAction: z.string().optional(),
  title: z.string(),
});

export const ScreenPresentationPropsSchema = z.object({
  sheet: z.boolean().optional(),
});

export const SecondaryActionPropsSchema = z.object({
  isEnabled: z.boolean().optional(),
  onPress: z.function(),
  text: z.string(),
});

export const SearchBarPropsSchema = z.object({
  editable: z.boolean().optional(),
  initialValue: z.string().optional(),
  onBlur: z.function().optional(),
  onFocus: z.function().optional(),
  onSearch: z.function(),
  onTextChange: z.function().optional(),
  placeholder: z.string().optional(),
});

export const SectionPropsSchema = z.object({
  action: z.string().optional(),
  title: z.string().optional(),
});

export const SectionHeaderActionSchema = z.object({
  onPress: z.function(),
  title: z.string(),
});

export const SectionHeaderPropsSchema = z.object({
  action: z.function().optional(),
  hideDivider: z.boolean().optional(),
  title: z.string(),
});

export const SegmentedControlPropsSchema = z.object({
  onSelect: z.function(),
  segments: z.string(),
  selected: z.string(),
});

export const SegmentSchema = z.object({
  disabled: z.boolean(),
  id: z.string(),
  label: z.string(),
});

export const SelectablePropsSchema = z.object({
  disabled: z.boolean().optional(),
  onPress: z.function(),
});

export const StackPropsSchema = z.object({
  alignContent: z.enum(["stretch"]).optional(),
  alignItems: z.enum(["stretch", "baseline"]).optional(),
  alignment: z.string().optional(),
  blockSize: z.string().optional(),
  columnGap: z.string().optional(),
  direction: z.enum(["inline", "block"]).optional(),
  flex: z.number().optional(),
  flexChildren: z.boolean().optional(),
  flexWrap: z.enum(["wrap", "nowrap", "wrap-reverse"]).optional(),
  gap: z.string().optional(),
  inlineSize: z.string().optional(),
  justifyContent: z.string().optional(),
  maxBlockSize: z.string().optional(),
  maxInlineSize: z.string().optional(),
  minBlockSize: z.string().optional(),
  minInlineSize: z.string().optional(),
  padding: z.string().optional(),
  paddingBlock: z.string().optional(),
  paddingBlockEnd: z.string().optional(),
  paddingBlockStart: z.string().optional(),
  paddingHorizontal: z.string().optional(),
  paddingInline: z.string().optional(),
  paddingInlineEnd: z.string().optional(),
  paddingInlineStart: z.string().optional(),
  paddingVertical: z.string().optional(),
  rowGap: z.string().optional(),
  spacing: z.string().optional(),
});

export const StepperPropsSchema = z.object({
  disabled: z.boolean().optional(),
  initialValue: z.number(),
  maximumValue: z.number().optional(),
  minimumValue: z.number().optional(),
  onValueChanged: z.function(),
  value: z.number().optional(),
});

export const TextPropsSchema = z.object({
  color: z.string().optional(),
  variant: z.string().optional(),
});

export const TextAreaPropsSchema = z.object({
  action: z.string().optional(),
  disabled: z.boolean().optional(),
  error: z.string().optional(),
  helpText: z.string().optional(),
  label: z.string(),
  maxLength: z.number().optional(),
  onBlur: z.function().optional(),
  onChange: z.function().optional(),
  onFocus: z.function().optional(),
  onInput: z.function().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  rows: z.number().optional(),
  value: z.string().optional(),
});

export const NewTextFieldPropsSchema = z.object({
  action: z.string().optional(),
  disabled: z.boolean().optional(),
  error: z.string().optional(),
  helpText: z.string().optional(),
  label: z.string(),
  maxLength: z.number().optional(),
  onBlur: z.function().optional(),
  onChange: z.function().optional(),
  onFocus: z.function().optional(),
  onInput: z.function().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  value: z.string().optional(),
});

export const TilePropsSchema = z.object({
  badgeValue: z.number().optional(),
  destructive: z.boolean().optional(),
  enabled: z.boolean().optional(),
  onPress: z.function().optional(),
  subtitle: z.string().optional(),
  title: z.string(),
});

export const TimeFieldPropsSchema = z.object({
  action: z.string().optional(),
  disabled: z.boolean().optional(),
  error: z.string().optional(),
  helpText: z.string().optional(),
  is24Hour: z.boolean().optional(),
  label: z.string(),
  onBlur: z.function().optional(),
  onChange: z.function().optional(),
  onFocus: z.function().optional(),
  value: z.string().optional(),
});

export const TimePickerPropsSchema = z.object({
  inputMode: z.enum(["inline", "spinner"]).optional(),
  is24Hour: z.boolean().optional(),
  onChange: z.function().optional(),
  selected: z.string().optional(),
  visibleState: z.function(),
});

export const CartUpdateEventDataSchema = z.object({
  cart: z.string(),
  connectivity: z.string(),
  device: z.string(),
  locale: z.string(),
  session: z.string(),
  storage: z.string(),
});

export const DeviceSchema = z.object({
  deviceId: z.number(),
  isTablet: z.boolean(),
  name: z.string(),
});

export const CashTrackingSessionCompleteDataSchema = z.object({
  cashTrackingSessionComplete: z.string(),
  connectivity: z.string(),
  device: z.string(),
  locale: z.string(),
  session: z.string(),
  storage: z.string(),
});

export const CashTrackingSessionStartDataSchema = z.object({
  cashTrackingSessionStart: z.string(),
  connectivity: z.string(),
  device: z.string(),
  locale: z.string(),
  session: z.string(),
  storage: z.string(),
});

export const TransactionCompleteWithReprintDataSchema = z.object({
  connectivity: z.string(),
  device: z.string(),
  locale: z.string(),
  session: z.string(),
  storage: z.string(),
  transaction: z.string(),
});

export const SaleTransactionDataSchema = z.object({
  balanceDue: z.string(),
  customer: z.string().optional(),
  discounts: z.string().optional(),
  draftCheckoutUuid: z.string().optional(),
  executedAt: z.string(),
  grandTotal: z.string(),
  lineItems: z.string(),
  orderId: z.number().optional(),
  paymentMethods: z.string(),
  shippingLines: z.string().optional(),
  subtotal: z.string(),
  taxLines: z.string().optional(),
  taxTotal: z.string(),
  transactionType: z.string(),
});

export const PaymentSchema = z.object({
  amount: z.number(),
  currency: z.string(),
  type: z.string(),
});

export const ShippingLineSchema = z.object({
  handle: z.string().optional(),
  price: z.string(),
  taxLines: z.string().optional(),
  title: z.string().optional(),
});

export const ReturnTransactionDataSchema = z.object({
  balanceDue: z.string(),
  customer: z.string().optional(),
  discounts: z.string().optional(),
  exchangeId: z.number().optional(),
  executedAt: z.string(),
  grandTotal: z.string(),
  lineItems: z.string(),
  orderId: z.number().optional(),
  paymentMethods: z.string(),
  returnId: z.number().optional(),
  shippingLines: z.string().optional(),
  subtotal: z.string(),
  taxLines: z.string().optional(),
  taxTotal: z.string(),
  transactionType: z.string(),
});

export const ExchangeTransactionDataSchema = z.object({
  balanceDue: z.string(),
  customer: z.string().optional(),
  discounts: z.string().optional(),
  exchangeId: z.number().optional(),
  executedAt: z.string(),
  grandTotal: z.string(),
  lineItemsAdded: z.string(),
  lineItemsRemoved: z.string(),
  orderId: z.number().optional(),
  paymentMethods: z.string(),
  shippingLines: z.string().optional(),
  subtotal: z.string(),
  taxLines: z.string().optional(),
  taxTotal: z.string(),
  transactionType: z.string(),
});

export const ReprintReceiptDataSchema = z.object({
  balanceDue: z.string(),
  customer: z.string().optional(),
  discounts: z.string().optional(),
  executedAt: z.string(),
  grandTotal: z.string(),
  lineItems: z.string(),
  orderId: z.number().optional(),
  paymentMethods: z.string(),
  shippingLines: z.string().optional(),
  subtotal: z.string(),
  taxLines: z.string().optional(),
  taxTotal: z.string(),
  transactionType: z.string(),
});

export const OrderLineItemSchema = z.object({
  attributedUserId: z.number().optional(),
  currentQuantity: z.number(),
  discounts: z.string(),
  isGiftCard: z.boolean(),
  price: z.number().optional(),
  productId: z.number().optional(),
  properties: z.string(),
  quantity: z.number(),
  refunds: z.string().optional(),
  sku: z.string().optional(),
  taxable: z.boolean(),
  taxLines: z.string(),
  title: z.string().optional(),
  uuid: z.string(),
  variantId: z.number().optional(),
  vendor: z.string().optional(),
});

export const LineItemRefundSchema = z.object({
  createdAt: z.string(),
  quantity: z.number(),
});

export const TransactionCompleteDataSchema = z.object({
  connectivity: z.string(),
  device: z.string(),
  locale: z.string(),
  session: z.string(),
  storage: z.string(),
  transaction: z.string(),
});
