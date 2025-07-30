import { z } from "zod";

// Generated schemas for component types
// This file is auto-generated - do not edit manually

// Tag name to TypeScript type mapping
/* eslint-disable @typescript-eslint/naming-convention */
export const TAG_TO_TYPE_MAPPING = {
  "s-avatar": "Avatar",
  "s-badge": "Badge",
  "s-banner": "Banner",
  "s-box": "Box",
  "s-button": "Button",
  "s-checkbox": "Checkbox",
  "s-choice": "ChoiceList",
  "s-choice-list": "ChoiceList",
  "s-clickable": "Clickable",
  "s-date-picker": "DatePicker",
  "s-divider": "Divider",
  "s-email-field": "EmailField",
  "s-grid": "Grid",
  "s-grid-item": "Grid",
  "s-heading": "Heading",
  "s-icon": "Icon",
  "s-image": "Image",
  "s-link": "Link",
  "s-money-field": "MoneyField",
  "s-number-field": "NumberField",
  "s-option": "Select",
  "s-page": "Page",
  "s-paragraph": "Paragraph",
  "s-password-field": "PasswordField",
  "s-query-container": "QueryContainer",
  "s-search-field": "SearchField",
  "s-section": "Page",
  "s-select": "Select",
  "s-spinner": "Spinner",
  "s-stack": "Stack",
  "s-switch": "Switch",
  "s-table": "Table",
  "s-table-body": "Table",
  "s-table-cell": "Table",
  "s-table-header": "Table",
  "s-table-header-row": "Table",
  "s-table-row": "Table",
  "s-text": "Page",
  "s-text-area": "TextArea",
  "s-text-field": "TextField",
  "s-thumbnail": "Thumbnail",
  "s-url-field": "URLField",
} as const;
/* eslint-enable @typescript-eslint/naming-convention */

export const _UIModalAttributesSchema = z.object({
  children: z.string().optional(),
  id: z.string().optional(),
  src: z.string().optional(),
  variant: z.enum(["small", "base", "large", "max"]).optional(),
});

export const UITitleBarAttributesSchema = z.object({
  children: z.string().optional(),
  title: z.string().optional(),
});

export const _UIModalElementSchema = z.object({
  addEventListener: z.function().optional(),
  content: z.string().optional(),
  contentWindow: z.string().optional(),
  hide: z.function().optional(),
  removeEventListener: z.function().optional(),
  show: z.function().optional(),
  src: z.string().optional(),
  toggle: z.function().optional(),
  variant: z.string().optional(),
});

export const _UINavMenuAttributesSchema = z.object({
  children: z.string().optional(),
});

export const UINavMenuFirstChildSchema = z.object({
  a: z.string(),
});

export const UINavMenuChildrenSchema = z.object({
  a: z.string().optional(),
});

export const _UISaveBarAttributesSchema = z.object({
  children: z.string().optional(),
  discardConfirmation: z.boolean().optional(),
  id: z.string().optional(),
});

export const UISaveBarChildrenSchema = z.object({
  button: z.string().optional(),
});

export const _UISaveBarElementSchema = z.object({
  addEventListener: z.function().optional(),
  discardConfirmation: z.boolean().optional(),
  hide: z.function().optional(),
  removeEventListener: z.function().optional(),
  show: z.function().optional(),
  showing: z.boolean().optional(),
  toggle: z.function().optional(),
});

export const _UITitleBarAttributesSchema = z.object({
  children: z.string().optional(),
  title: z.string().optional(),
});

export const UITitleBarChildrenSchema = z.object({
  a: z.enum(["breadcrumb", "primary"]).optional(),
  button: z.enum(["breadcrumb", "primary", "critical", "default"]).optional(),
  section: z.string().optional(),
});

export const BaseElementAttributesSchema = z.object({
  children: z.string().optional(),
  class: z.string().optional(),
  href: z.string().optional(),
  id: z.string().optional(),
  name: z.string().optional(),
  onclick: z.string().optional(),
  rel: z.string().optional(),
  target: z.string().optional(),
});

export const AvatarSchema = z.object({
  alt: z.string().optional(),
  initials: z.string().optional(),
  size: z.enum(["small", "small-200", "base", "large", "large-200"]).optional(),
  src: z.string().optional(),
});

export const ClickOptionsSchema = z.object({
  sourceEvent: z.string().optional(),
});

export const ActivationEventEsqueSchema = z.object({
  button: z.number().optional(),
  ctrlKey: z.boolean().optional(),
  metaKey: z.boolean().optional(),
  shiftKey: z.boolean().optional(),
});

export const AvatarEventsSchema = z.object({
  error: z.string().optional(),
  load: z.string().optional(),
});

export const BadgeSchema = z.object({
  color: z.enum(["base", "strong"]).optional(),
  icon: z.string().optional(),
  size: z.enum(["base", "large", "large-100"]).optional(),
  tone: z
    .enum([
      "info",
      "success",
      "warning",
      "critical",
      "auto",
      "neutral",
      "caution",
    ])
    .optional(),
});

export const BannerSchema = z.object({
  dismissible: z.boolean().optional(),
  heading: z.string().optional(),
  hidden: z.boolean().optional(),
  tone: z.enum(["info", "success", "warning", "critical", "auto"]).optional(),
});

export const BannerEventsSchema = z.object({
  afterhide: z.string().optional(),
  dismiss: z.string().optional(),
});

export const BannerSlotsSchema = z.object({
  secondaryActions: z.string().optional(),
});

export const BoxSchema = z.object({
  accessibilityLabel: z.string().optional(),
  accessibilityRole: z.string().optional(),
  accessibilityVisibility: z
    .enum(["visible", "hidden", "exclusive"])
    .optional(),
  background: z.string().optional(),
  blockSize: z.string().optional(),
  border: z.string().optional(),
  borderColor: z.string().optional(),
  borderRadius: z.string().optional(),
  borderStyle: z.string().optional(),
  borderWidth: z
    .enum([
      " | MaybeAllValuesShorthandProperty<",
      " | ",
      " | ",
      " | ",
      " | ",
      " | ",
    ])
    .optional(),
  display: z.enum(["auto", "none"]).optional(),
  inlineSize: z.string().optional(),
  maxBlockSize: z.string().optional(),
  maxInlineSize: z.string().optional(),
  minBlockSize: z.string().optional(),
  minInlineSize: z.string().optional(),
  overflow: z.enum(["visible", "hidden"]).optional(),
  padding: z.string().optional(),
  paddingBlock: z.string().optional(),
  paddingBlockEnd: z.string().optional(),
  paddingBlockStart: z.string().optional(),
  paddingInline: z.string().optional(),
  paddingInlineEnd: z.string().optional(),
  paddingInlineStart: z.string().optional(),
});

export const ButtonSchema = z.object({
  accessibilityLabel: z.string().optional(),
  command: z.enum(["--auto", "--show", "--hide", "--toggle"]).optional(),
  commandFor: z.string().optional(),
  disabled: z.boolean().optional(),
  download: z.string().optional(),
  href: z.string().optional(),
  icon: z.string().optional(),
  loading: z.boolean().optional(),
  target: z.enum(["auto", "_blank", "_self", "_parent", "_top"]).optional(),
  tone: z.enum(["critical", "auto", "neutral"]).optional(),
  type: z.enum(["button", "reset", "submit"]).optional(),
  variant: z.enum(["auto", "primary", "secondary", "tertiary"]).optional(),
});

export const ButtonEventsSchema = z.object({
  blur: z.string().optional(),
  click: z.string().optional(),
  focus: z.string().optional(),
});

export const CheckboxSchema = z.object({
  accessibilityLabel: z.string().optional(),
  checked: z.boolean().optional(),
  defaultChecked: z.boolean().optional(),
  defaultIndeterminate: z.boolean().optional(),
  details: z.string().optional(),
  disabled: z.boolean().optional(),
  error: z.string().optional(),
  id: z.string().optional(),
  indeterminate: z.boolean().optional(),
  label: z.string().optional(),
  name: z.string().optional(),
  required: z.boolean().optional(),
  value: z.string().optional(),
});

export const CheckboxEventsSchema = z.object({
  change: z.string().optional(),
  input: z.string().optional(),
});

export const ChoiceListSchema = z.object({
  details: z.string().optional(),
  disabled: z.boolean().optional(),
  error: z.string().optional(),
  label: z.string().optional(),
  labelAccessibilityVisibility: z.enum(["visible", "exclusive"]).optional(),
  multiple: z.boolean().optional(),
  name: z.string().optional(),
  values: z.string().optional(),
});

export const ChoiceSchema = z.object({
  accessibilityLabel: z.string().optional(),
  defaultSelected: z.boolean().optional(),
  details: z.string().optional(),
  disabled: z.boolean().optional(),
  label: z.string().optional(),
  selected: z.boolean().optional(),
  value: z.string().optional(),
});

export const ChoiceListEventsSchema = z.object({
  change: z.string().optional(),
  input: z.string().optional(),
});

export const ClickableSchema = z.object({
  accessibilityLabel: z.string().optional(),
  accessibilityRole: z.string().optional(),
  accessibilityVisibility: z
    .enum(["visible", "hidden", "exclusive"])
    .optional(),
  background: z.string().optional(),
  blockSize: z.string().optional(),
  border: z.string().optional(),
  borderColor: z.string().optional(),
  borderRadius: z.string().optional(),
  borderStyle: z.string().optional(),
  borderWidth: z
    .enum([
      " | MaybeAllValuesShorthandProperty<",
      " | ",
      " | ",
      " | ",
      " | ",
      " | ",
    ])
    .optional(),
  command: z.enum(["--auto", "--show", "--hide", "--toggle"]).optional(),
  commandFor: z.string().optional(),
  disabled: z.boolean().optional(),
  display: z.enum(["auto", "none"]).optional(),
  download: z.string().optional(),
  href: z.string().optional(),
  inlineSize: z.string().optional(),
  loading: z.boolean().optional(),
  maxBlockSize: z.string().optional(),
  maxInlineSize: z.string().optional(),
  minBlockSize: z.string().optional(),
  minInlineSize: z.string().optional(),
  overflow: z.enum(["visible", "hidden"]).optional(),
  padding: z.string().optional(),
  paddingBlock: z.string().optional(),
  paddingBlockEnd: z.string().optional(),
  paddingBlockStart: z.string().optional(),
  paddingInline: z.string().optional(),
  paddingInlineEnd: z.string().optional(),
  paddingInlineStart: z.string().optional(),
  target: z.enum(["auto", "_blank", "_self", "_parent", "_top"]).optional(),
  type: z.enum(["button", "reset", "submit"]).optional(),
});

export const ClickableEventsSchema = z.object({
  blur: z.string().optional(),
  click: z.string().optional(),
  focus: z.string().optional(),
});

export const DatePickerSchema = z.object({
  allow: z.string().optional(),
  allowDays: z.string().optional(),
  defaultValue: z.string().optional(),
  defaultView: z.string().optional(),
  disallow: z.string().optional(),
  disallowDays: z.string().optional(),
  name: z.string().optional(),
  type: z.enum(["single", "multiple", "range"]).optional(),
  value: z.string().optional(),
  view: z.string().optional(),
});

export const DatePickerEventsSchema = z.object({
  blur: z.string().optional(),
  change: z.string().optional(),
  focus: z.string().optional(),
  input: z.string().optional(),
  viewchange: z.enum(["viewchange"]).optional(),
});

export const DividerSchema = z.object({
  color: z.enum(["base", "strong"]).optional(),
  direction: z.enum(["inline", "block"]).optional(),
});

export const EmailFieldSchema = z.object({
  autocomplete: z
    .enum([
      "on",
      "off",
      "shipping email",
      "shipping home email",
      "shipping mobile email",
      "shipping fax email",
      "shipping pager email",
      "billing email",
      "billing home email",
      "billing mobile email",
      "billing fax email",
      "billing pager email",
    ])
    .optional(),
  defaultValue: z.string().optional(),
  details: z.string().optional(),
  disabled: z.boolean().optional(),
  error: z.string().optional(),
  id: z.string().optional(),
  label: z.string().optional(),
  labelAccessibilityVisibility: z.enum(["visible", "exclusive"]).optional(),
  maxLength: z.number().optional(),
  minLength: z.number().optional(),
  name: z.string().optional(),
  placeholder: z.string().optional(),
  readOnly: z.boolean().optional(),
  required: z.boolean().optional(),
  value: z.string().optional(),
});

export const EmailFieldEventsSchema = z.object({
  blur: z.string().optional(),
  change: z.string().optional(),
  focus: z.string().optional(),
  input: z.string().optional(),
});

export const GridSchema = z.object({
  accessibilityLabel: z.string().optional(),
  accessibilityRole: z.string().optional(),
  accessibilityVisibility: z
    .enum(["visible", "hidden", "exclusive"])
    .optional(),
  alignContent: z.string().optional(),
  alignItems: z.string().optional(),
  background: z.string().optional(),
  blockSize: z.string().optional(),
  border: z.string().optional(),
  borderColor: z.string().optional(),
  borderRadius: z.string().optional(),
  borderStyle: z.string().optional(),
  borderWidth: z
    .enum([
      " | MaybeAllValuesShorthandProperty<",
      " | ",
      " | ",
      " | ",
      " | ",
      " | ",
    ])
    .optional(),
  columnGap: z.string().optional(),
  display: z.enum(["auto", "none"]).optional(),
  gap: z.string().optional(),
  gridTemplateColumns: z.string().optional(),
  gridTemplateRows: z.string().optional(),
  inlineSize: z.string().optional(),
  justifyContent: z.string().optional(),
  justifyItems: z.string().optional(),
  maxBlockSize: z.string().optional(),
  maxInlineSize: z.string().optional(),
  minBlockSize: z.string().optional(),
  minInlineSize: z.string().optional(),
  overflow: z.enum(["visible", "hidden"]).optional(),
  padding: z.string().optional(),
  paddingBlock: z.string().optional(),
  paddingBlockEnd: z.string().optional(),
  paddingBlockStart: z.string().optional(),
  paddingInline: z.string().optional(),
  paddingInlineEnd: z.string().optional(),
  paddingInlineStart: z.string().optional(),
  placeContent: z.string().optional(),
  placeItems: z.string().optional(),
  rowGap: z.string().optional(),
});

export const GridItemSchema = z.object({
  accessibilityLabel: z.string().optional(),
  accessibilityRole: z.string().optional(),
  accessibilityVisibility: z
    .enum(["visible", "hidden", "exclusive"])
    .optional(),
  background: z.string().optional(),
  blockSize: z.string().optional(),
  border: z.string().optional(),
  borderColor: z.string().optional(),
  borderRadius: z.string().optional(),
  borderStyle: z.string().optional(),
  borderWidth: z
    .enum([
      " | MaybeAllValuesShorthandProperty<",
      " | ",
      " | ",
      " | ",
      " | ",
      " | ",
    ])
    .optional(),
  display: z.enum(["auto", "none"]).optional(),
  gridColumn: z.enum(["auto"]).optional(),
  gridRow: z.enum(["auto"]).optional(),
  inlineSize: z.string().optional(),
  maxBlockSize: z.string().optional(),
  maxInlineSize: z.string().optional(),
  minBlockSize: z.string().optional(),
  minInlineSize: z.string().optional(),
  overflow: z.enum(["visible", "hidden"]).optional(),
  padding: z.string().optional(),
  paddingBlock: z.string().optional(),
  paddingBlockEnd: z.string().optional(),
  paddingBlockStart: z.string().optional(),
  paddingInline: z.string().optional(),
  paddingInlineEnd: z.string().optional(),
  paddingInlineStart: z.string().optional(),
});

export const HeadingSchema = z.object({
  accessibilityRole: z.enum(["none", "presentation", "heading"]).optional(),
  accessibilityVisibility: z
    .enum(["visible", "hidden", "exclusive"])
    .optional(),
  lineClamp: z.number().optional(),
});

export const IconSchema = z.object({
  color: z.enum(["base", "subdued"]).optional(),
  size: z.enum(["small", "base"]).optional(),
  tone: z
    .enum([
      "info",
      "success",
      "warning",
      "critical",
      "auto",
      "neutral",
      "caution",
    ])
    .optional(),
  type: z.string().optional(),
});

export const ImageSchema = z.object({
  accessibilityRole: z.enum(["none", "presentation", "img"]).optional(),
  alt: z.string().optional(),
  aspectRatio: z.string().optional(),
  border: z.string().optional(),
  borderColor: z.string().optional(),
  borderRadius: z.string().optional(),
  borderStyle: z.string().optional(),
  borderWidth: z
    .enum([
      " | MaybeAllValuesShorthandProperty<",
      " | ",
      " | ",
      " | ",
      " | ",
      " | ",
    ])
    .optional(),
  inlineSize: z.enum(["auto", "fill"]).optional(),
  loading: z.enum(["eager", "lazy"]).optional(),
  objectFit: z.enum(["contain", "cover"]).optional(),
  sizes: z.string().optional(),
  src: z.string().optional(),
  srcSet: z.string().optional(),
});

export const ImageEventsSchema = z.object({
  error: z.string().optional(),
  load: z.string().optional(),
});

export const LinkSchema = z.object({
  accessibilityLabel: z.string().optional(),
  command: z.enum(["--auto", "--show", "--hide", "--toggle"]).optional(),
  commandFor: z.string().optional(),
  download: z.string().optional(),
  href: z.string().optional(),
  lang: z.string().optional(),
  target: z.enum(["auto", "_blank", "_self", "_parent", "_top"]).optional(),
  tone: z.enum(["critical", "auto", "neutral"]).optional(),
});

export const LinkEventsSchema = z.object({
  click: z.string().optional(),
});

export const MoneyFieldSchema = z.object({
  autocomplete: z.string().optional(),
  currencyCode: z.string().optional(),
  defaultValue: z.string().optional(),
  details: z.string().optional(),
  disabled: z.boolean().optional(),
  error: z.string().optional(),
  id: z.string().optional(),
  label: z.string().optional(),
  labelAccessibilityVisibility: z.enum(["visible", "exclusive"]).optional(),
  max: z.number().optional(),
  min: z.number().optional(),
  name: z.string().optional(),
  placeholder: z.string().optional(),
  readOnly: z.boolean().optional(),
  required: z.boolean().optional(),
  step: z.number().optional(),
  value: z.string().optional(),
});

export const MoneyFieldEventsSchema = z.object({
  blur: z.string().optional(),
  change: z.string().optional(),
  focus: z.string().optional(),
  input: z.string().optional(),
});

export const NumberFieldSchema = z.object({
  autocomplete: z
    .enum([
      "on",
      "off",
      "shipping one-time-code",
      "shipping cc-number",
      "shipping cc-csc",
      "billing one-time-code",
      "billing cc-number",
      "billing cc-csc",
    ])
    .optional(),
  defaultValue: z.string().optional(),
  details: z.string().optional(),
  disabled: z.boolean().optional(),
  error: z.string().optional(),
  id: z.string().optional(),
  inputMode: z.enum(["decimal", "numeric"]).optional(),
  label: z.string().optional(),
  labelAccessibilityVisibility: z.enum(["visible", "exclusive"]).optional(),
  max: z.number().optional(),
  min: z.number().optional(),
  name: z.string().optional(),
  placeholder: z.string().optional(),
  prefix: z.string().optional(),
  readOnly: z.boolean().optional(),
  required: z.boolean().optional(),
  step: z.number().optional(),
  suffix: z.string().optional(),
  value: z.string().optional(),
});

export const NumberFieldEventsSchema = z.object({
  blur: z.string().optional(),
  change: z.string().optional(),
  focus: z.string().optional(),
  input: z.string().optional(),
});

export const PageSchema = z.object({
  connectedCallback: z.function().optional(),
  disconnectedCallback: z.function().optional(),
  inlineSize: z.enum(["small", "base", "large"]).optional(),
});

export const PageSlotsSchema = z.object({
  aside: z.string().optional(),
});

export const ParagraphSchema = z.object({
  accessibilityVisibility: z
    .enum(["visible", "hidden", "exclusive"])
    .optional(),
  color: z.enum(["base", "subdued"]).optional(),
  dir: z.enum([" | ", " | ", " | "]).optional(),
  fontVariantNumeric: z.enum(["auto", "normal", "tabular-nums"]).optional(),
  lineClamp: z.number().optional(),
  tone: z
    .enum([
      "info",
      "success",
      "warning",
      "critical",
      "auto",
      "neutral",
      "caution",
    ])
    .optional(),
});

export const PasswordFieldSchema = z.object({
  autocomplete: z
    .enum([
      "on",
      "off",
      "shipping current-password",
      "shipping new-password",
      "billing current-password",
      "billing new-password",
    ])
    .optional(),
  defaultValue: z.string().optional(),
  details: z.string().optional(),
  disabled: z.boolean().optional(),
  error: z.string().optional(),
  id: z.string().optional(),
  label: z.string().optional(),
  labelAccessibilityVisibility: z.enum(["visible", "exclusive"]).optional(),
  maxLength: z.number().optional(),
  minLength: z.number().optional(),
  name: z.string().optional(),
  placeholder: z.string().optional(),
  readOnly: z.boolean().optional(),
  required: z.boolean().optional(),
  value: z.string().optional(),
});

export const PasswordFieldEventsSchema = z.object({
  blur: z.string().optional(),
  change: z.string().optional(),
  focus: z.string().optional(),
  input: z.string().optional(),
});

export const QueryContainerSchema = z.object({
  containerName: z.string().optional(),
});

export const SearchFieldSchema = z.object({
  autocomplete: z.string().optional(),
  defaultValue: z.string().optional(),
  details: z.string().optional(),
  disabled: z.boolean().optional(),
  error: z.string().optional(),
  id: z.string().optional(),
  label: z.string().optional(),
  labelAccessibilityVisibility: z.enum(["visible", "exclusive"]).optional(),
  maxLength: z.number().optional(),
  minLength: z.number().optional(),
  name: z.string().optional(),
  placeholder: z.string().optional(),
  readOnly: z.boolean().optional(),
  required: z.boolean().optional(),
  value: z.string().optional(),
});

export const SearchFieldEventsSchema = z.object({
  blur: z.string().optional(),
  change: z.string().optional(),
  focus: z.string().optional(),
  input: z.string().optional(),
});

export const SectionSchema = z.object({
  accessibilityLabel: z.string().optional(),
  heading: z.string().optional(),
  padding: z.enum(["base", "none"]).optional(),
});

export const SelectSchema = z.object({
  details: z.string().optional(),
  disabled: z.boolean().optional(),
  disconnectedCallback: z.function().optional(),
  error: z.string().optional(),
  icon: z.string().optional(),
  id: z.string().optional(),
  label: z.string().optional(),
  labelAccessibilityVisibility: z.enum(["visible", "exclusive"]).optional(),
  name: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  value: z.string().optional(),
});

export const SelectEventsSchema = z.object({
  change: z.string().optional(),
  input: z.string().optional(),
});

export const SpinnerSchema = z.object({
  accessibilityLabel: z.string().optional(),
  size: z.enum(["base", "large", "large-100"]).optional(),
});

export const StackSchema = z.object({
  accessibilityLabel: z.string().optional(),
  accessibilityRole: z.string().optional(),
  accessibilityVisibility: z
    .enum(["visible", "hidden", "exclusive"])
    .optional(),
  alignContent: z.string().optional(),
  alignItems: z.string().optional(),
  background: z.string().optional(),
  blockSize: z.string().optional(),
  border: z.string().optional(),
  borderColor: z.string().optional(),
  borderRadius: z.string().optional(),
  borderStyle: z.string().optional(),
  borderWidth: z
    .enum([
      " | MaybeAllValuesShorthandProperty<",
      " | ",
      " | ",
      " | ",
      " | ",
      " | ",
    ])
    .optional(),
  columnGap: z.string().optional(),
  direction: z.enum(["inline", "block"]).optional(),
  display: z.enum(["auto", "none"]).optional(),
  gap: z.string().optional(),
  inlineSize: z.string().optional(),
  justifyContent: z.string().optional(),
  maxBlockSize: z.string().optional(),
  maxInlineSize: z.string().optional(),
  minBlockSize: z.string().optional(),
  minInlineSize: z.string().optional(),
  overflow: z.enum(["visible", "hidden"]).optional(),
  padding: z.string().optional(),
  paddingBlock: z.string().optional(),
  paddingBlockEnd: z.string().optional(),
  paddingBlockStart: z.string().optional(),
  paddingInline: z.string().optional(),
  paddingInlineEnd: z.string().optional(),
  paddingInlineStart: z.string().optional(),
  rowGap: z.string().optional(),
});

export const SwitchSchema = z.object({
  accessibilityLabel: z.string().optional(),
  checked: z.boolean().optional(),
  defaultChecked: z.boolean().optional(),
  details: z.string().optional(),
  disabled: z.boolean().optional(),
  error: z.string().optional(),
  id: z.string().optional(),
  label: z.string().optional(),
  labelAccessibilityVisibility: z.enum(["visible", "exclusive"]).optional(),
  name: z.string().optional(),
  required: z.boolean().optional(),
  value: z.string().optional(),
});

export const SwitchEventsSchema = z.object({
  change: z.string().optional(),
  input: z.string().optional(),
});

export const TableSchema = z.object({
  hasNextPage: z.boolean().optional(),
  hasPreviousPage: z.boolean().optional(),
  loading: z.boolean().optional(),
  paginate: z.boolean().optional(),
  variant: z.enum(["auto", "list"]).optional(),
});

export const AddedContextSchema = z.object({
  addEventListener: z.function().optional(),
  dispatchEvent: z.function().optional(),
  removeEventListener: z.function().optional(),
  value: z.string().optional(),
});

export const TableSlotsSchema = z.object({
  filters: z.string().optional(),
});

export const TableEventsSchema = z.object({
  nextpage: z.string().optional(),
  previouspage: z.string().optional(),
});

export const TableHeaderSchema = z.object({
  listSlot: z.string().optional(),
});

export const TableHeaderRowSchema = z.object({
  disconnectedCallback: z.function().optional(),
});

export const TextSchema = z.object({
  accessibilityVisibility: z
    .enum(["visible", "hidden", "exclusive"])
    .optional(),
  color: z.enum(["base", "subdued"]).optional(),
  dir: z.enum([" | ", " | ", " | "]).optional(),
  fontVariantNumeric: z.enum(["auto", "normal", "tabular-nums"]).optional(),
  tone: z
    .enum([
      "info",
      "success",
      "warning",
      "critical",
      "auto",
      "neutral",
      "caution",
    ])
    .optional(),
  type: z.enum(["strong", "generic", "address", "redundant"]).optional(),
});

export const TextAreaSchema = z.object({
  autocomplete: z.string().optional(),
  defaultValue: z.string().optional(),
  details: z.string().optional(),
  disabled: z.boolean().optional(),
  error: z.string().optional(),
  id: z.string().optional(),
  label: z.string().optional(),
  labelAccessibilityVisibility: z.enum(["visible", "exclusive"]).optional(),
  maxLength: z.number().optional(),
  minLength: z.number().optional(),
  name: z.string().optional(),
  placeholder: z.string().optional(),
  readOnly: z.boolean().optional(),
  required: z.boolean().optional(),
  rows: z.number().optional(),
  value: z.string().optional(),
});

export const TextAreaEventsSchema = z.object({
  blur: z.string().optional(),
  change: z.string().optional(),
  focus: z.string().optional(),
  input: z.string().optional(),
});

export const TextFieldSchema = z.object({
  autocomplete: z.string().optional(),
  defaultValue: z.string().optional(),
  details: z.string().optional(),
  disabled: z.boolean().optional(),
  error: z.string().optional(),
  icon: z.string().optional(),
  id: z.string().optional(),
  label: z.string().optional(),
  labelAccessibilityVisibility: z.enum(["visible", "exclusive"]).optional(),
  maxLength: z.number().optional(),
  minLength: z.number().optional(),
  name: z.string().optional(),
  placeholder: z.string().optional(),
  prefix: z.string().optional(),
  readOnly: z.boolean().optional(),
  required: z.boolean().optional(),
  suffix: z.string().optional(),
  value: z.string().optional(),
});

export const TextFieldSlotsSchema = z.object({
  accessory: z.string().optional(),
});

export const TextFieldEventsSchema = z.object({
  blur: z.string().optional(),
  change: z.string().optional(),
  focus: z.string().optional(),
  input: z.string().optional(),
});

export const ThumbnailSchema = z.object({
  alt: z.string().optional(),
  size: z
    .enum(["small", "small-200", "small-100", "base", "large", "large-100"])
    .optional(),
  src: z.string().optional(),
});

export const ThumbnailEventsSchema = z.object({
  error: z.string().optional(),
  load: z.string().optional(),
});

export const URLFieldSchema = z.object({
  autocomplete: z
    .enum([
      "on",
      "off",
      "shipping url",
      "shipping photo",
      "shipping impp",
      "shipping home impp",
      "shipping mobile impp",
      "shipping fax impp",
      "shipping pager impp",
      "billing url",
      "billing photo",
      "billing impp",
      "billing home impp",
      "billing mobile impp",
      "billing fax impp",
      "billing pager impp",
    ])
    .optional(),
  defaultValue: z.string().optional(),
  details: z.string().optional(),
  disabled: z.boolean().optional(),
  error: z.string().optional(),
  id: z.string().optional(),
  label: z.string().optional(),
  labelAccessibilityVisibility: z.enum(["visible", "exclusive"]).optional(),
  maxLength: z.number().optional(),
  minLength: z.number().optional(),
  name: z.string().optional(),
  placeholder: z.string().optional(),
  readOnly: z.boolean().optional(),
  required: z.boolean().optional(),
  value: z.string().optional(),
});

export const URLFieldEventsSchema = z.object({
  blur: z.string().optional(),
  change: z.string().optional(),
  focus: z.string().optional(),
  input: z.string().optional(),
});
