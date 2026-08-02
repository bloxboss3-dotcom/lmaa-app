import type { ContentBundle, ContentRepository, Draft } from '@/data'
import type { IconName } from '@/components/ui/Icon'
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_PRIORITIES,
  RESOURCE_COLLECTIONS,
  RESOURCE_TYPES,
  SCHEDULE_STATUSES,
  type AcademyEvent,
  type Announcement,
  type Faq,
  type GalleryItem,
  type LearningResource,
  type Page,
  type Program,
  type ScheduleEntry,
  type Weekday,
} from '@/domain/types'
import { CATEGORY_LABELS, PRIORITY_LABELS } from '@/domain/announcements'
import { formatDate, formatDateTime, fromDateTimeLocalInput, toDateTimeLocalInput } from '@/domain/format'
import { WEEKDAYS, formatTimeRange, weekdayLabel } from '@/domain/schedule'
import {
  endAfterStart,
  endDateAfterStart,
  expiresAfterPublish,
  slugify,
  type FieldDef,
  type FormValues,
} from './validation'

/**
 * One definition per content type drives the whole admin area: the list
 * screen, the form, validation, saving and deleting. Adding a field is a
 * one-line change here rather than a new screen.
 */

export interface AdminRecord {
  id: string
  published: boolean
  createdAt: string
  updatedAt: string
  isSample?: boolean
}

export interface CollectionContext {
  programs: Program[]
}

export interface CollectionConfig<T extends AdminRecord = AdminRecord> {
  key: string
  /** Plural, family-friendly name. */
  title: string
  /** Singular, used in buttons and confirmations. */
  singular: string
  icon: IconName
  description: string
  /** Announcements can offer to send a push notification. */
  supportsPush?: boolean
  fields: (context: CollectionContext) => FieldDef[]
  defaults: (context: CollectionContext) => FormValues
  toValues: (record: T) => FormValues
  toDraft: (values: FormValues, existing?: T) => Draft<T>
  list: (bundle: ContentBundle) => T[]
  primaryText: (record: T) => string
  secondaryText: (record: T) => string
  save: (repository: ContentRepository, draft: Draft<T>) => Promise<T>
  remove: (repository: ContentRepository, id: string) => Promise<void>
}

function define<T extends AdminRecord>(config: CollectionConfig<T>): CollectionConfig {
  // Single, contained type erasure so each definition below stays fully typed.
  return config as unknown as CollectionConfig
}

const str = (value: FormValues[string]): string => String(value ?? '').trim()
const optionalStr = (value: FormValues[string]): string | undefined => {
  const text = str(value)
  return text === '' ? undefined : text
}
const num = (value: FormValues[string], fallback = 0): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const publishedField: FieldDef = {
  name: 'published',
  label: 'Visible to families',
  type: 'checkbox',
  hint: 'Turn this off to keep it as a draft that only staff can see.',
  wide: true,
}

/* ---------------------------------------------------------- announcements */

const announcements = define<Announcement>({
  key: 'announcements',
  title: 'Updates',
  singular: 'update',
  icon: 'megaphone',
  description: 'Announcements families see in the Updates tab.',
  supportsPush: true,
  fields: () => [
    { name: 'title', label: 'Headline', type: 'text', required: true, wide: true },
    {
      name: 'body',
      label: 'Message',
      type: 'textarea',
      required: true,
      rows: 8,
      hint: 'Leave a blank line between paragraphs. Start a line with "- " to make a bullet.',
    },
    {
      name: 'category',
      label: 'Category',
      type: 'select',
      required: true,
      options: ANNOUNCEMENT_CATEGORIES.map((value) => ({ value, label: CATEGORY_LABELS[value] })),
    },
    {
      name: 'priority',
      label: 'Importance',
      type: 'select',
      options: ANNOUNCEMENT_PRIORITIES.map((value) => ({ value, label: PRIORITY_LABELS[value] })),
    },
    {
      name: 'publishedAt',
      label: 'Post at',
      type: 'datetime',
      required: true,
      hint: 'Choose a time in the future to schedule the post.',
    },
    {
      name: 'expiresAt',
      label: 'Remove automatically on',
      type: 'datetime',
      hint: 'Optional. Leave blank to keep it until you delete it.',
      validate: expiresAfterPublish('publishedAt', 'expiresAt'),
    },
    { name: 'imageUrl', label: 'Image address', type: 'url', hint: 'Optional.' },
    { name: 'actionLabel', label: 'Button text', type: 'text', hint: 'Optional, e.g. "Sign up".' },
    {
      name: 'actionUrl',
      label: 'Button link',
      type: 'url',
      hint: 'Where the button goes. Use #/schedule to link inside the app.',
    },
    {
      name: 'pinned',
      label: 'Pin to the top of the feed',
      type: 'checkbox',
    },
    publishedField,
  ],
  defaults: () => ({
    title: '',
    body: '',
    category: 'important',
    priority: 'normal',
    publishedAt: toDateTimeLocalInput(new Date().toISOString()),
    expiresAt: '',
    imageUrl: '',
    actionLabel: '',
    actionUrl: '',
    pinned: false,
    published: true,
  }),
  toValues: (record) => ({
    title: record.title,
    body: record.body,
    category: record.category,
    priority: record.priority,
    publishedAt: toDateTimeLocalInput(record.publishedAt),
    expiresAt: toDateTimeLocalInput(record.expiresAt),
    imageUrl: record.imageUrl ?? '',
    actionLabel: record.actionLabel ?? '',
    actionUrl: record.actionUrl ?? '',
    pinned: record.pinned,
    published: record.published,
  }),
  toDraft: (values, existing) => ({
    id: existing?.id,
    title: str(values.title),
    body: str(values.body),
    category: str(values.category) as Announcement['category'],
    priority: (optionalStr(values.priority) ?? 'normal') as Announcement['priority'],
    pinned: Boolean(values.pinned),
    published: Boolean(values.published),
    publishedAt: fromDateTimeLocalInput(str(values.publishedAt)) || new Date().toISOString(),
    expiresAt: fromDateTimeLocalInput(str(values.expiresAt)) || undefined,
    imageUrl: optionalStr(values.imageUrl),
    actionLabel: optionalStr(values.actionLabel),
    actionUrl: optionalStr(values.actionUrl),
  }),
  list: (bundle) => bundle.announcements,
  primaryText: (record) => record.title,
  secondaryText: (record) =>
    `${CATEGORY_LABELS[record.category]} · ${formatDateTime(record.publishedAt)}`,
  save: (repository, draft) => repository.saveAnnouncement(draft),
  remove: (repository, id) => repository.deleteAnnouncement(id),
})

/* ------------------------------------------------------------------ events */

const events = define<AcademyEvent>({
  key: 'events',
  title: 'Events',
  singular: 'event',
  icon: 'star',
  description: 'Tournaments, testings, camps and celebrations.',
  fields: () => [
    { name: 'title', label: 'Event name', type: 'text', required: true, wide: true },
    { name: 'startAt', label: 'Starts', type: 'datetime', required: true },
    {
      name: 'endAt',
      label: 'Ends',
      type: 'datetime',
      hint: 'Optional.',
      validate: endDateAfterStart('startAt', 'endAt'),
    },
    { name: 'allDay', label: 'All-day event', type: 'checkbox' },
    { name: 'location', label: 'Place name', type: 'text', hint: 'e.g. "LMAA main dojang".' },
    { name: 'address', label: 'Address', type: 'text', hint: 'Used for the Directions button.' },
    { name: 'description', label: 'Details', type: 'textarea', required: true, rows: 7 },
    { name: 'audience', label: 'Who it is for', type: 'text', hint: 'e.g. "All students".' },
    { name: 'imageUrl', label: 'Image address', type: 'url' },
    { name: 'registrationUrl', label: 'Registration link', type: 'url' },
    { name: 'waiverUrl', label: 'Waiver form link', type: 'url' },
    { name: 'publishedAt', label: 'Post at', type: 'datetime', required: true },
    { name: 'featured', label: 'Feature on the home screen', type: 'checkbox' },
    publishedField,
  ],
  defaults: () => ({
    title: '',
    startAt: '',
    endAt: '',
    allDay: false,
    location: '',
    address: '',
    description: '',
    audience: '',
    imageUrl: '',
    registrationUrl: '',
    waiverUrl: '',
    publishedAt: toDateTimeLocalInput(new Date().toISOString()),
    featured: false,
    published: true,
  }),
  toValues: (record) => ({
    title: record.title,
    startAt: toDateTimeLocalInput(record.startAt),
    endAt: toDateTimeLocalInput(record.endAt),
    allDay: record.allDay,
    location: record.location ?? '',
    address: record.address ?? '',
    description: record.description,
    audience: record.audience ?? '',
    imageUrl: record.imageUrl ?? '',
    registrationUrl: record.registrationUrl ?? '',
    waiverUrl: record.waiverUrl ?? '',
    publishedAt: toDateTimeLocalInput(record.publishedAt),
    featured: record.featured,
    published: record.published,
  }),
  toDraft: (values, existing) => ({
    id: existing?.id,
    title: str(values.title),
    startAt: fromDateTimeLocalInput(str(values.startAt)),
    endAt: fromDateTimeLocalInput(str(values.endAt)) || undefined,
    allDay: Boolean(values.allDay),
    location: optionalStr(values.location),
    address: optionalStr(values.address),
    description: str(values.description),
    audience: optionalStr(values.audience),
    imageUrl: optionalStr(values.imageUrl),
    registrationUrl: optionalStr(values.registrationUrl),
    waiverUrl: optionalStr(values.waiverUrl),
    featured: Boolean(values.featured),
    published: Boolean(values.published),
    publishedAt: fromDateTimeLocalInput(str(values.publishedAt)) || new Date().toISOString(),
  }),
  list: (bundle) => bundle.events,
  primaryText: (record) => record.title,
  secondaryText: (record) => formatDateTime(record.startAt),
  save: (repository, draft) => repository.saveEvent(draft),
  remove: (repository, id) => repository.deleteEvent(id),
})

/* ---------------------------------------------------------------- schedule */

const schedule = define<ScheduleEntry>({
  key: 'schedule',
  title: 'Class schedule',
  singular: 'class',
  icon: 'calendar',
  description: 'Weekly class times, cancellations and temporary changes.',
  fields: (context) => [
    { name: 'className', label: 'Class name', type: 'text', required: true },
    {
      name: 'programSlug',
      label: 'Program',
      type: 'select',
      options: [
        { value: '', label: 'No program' },
        ...context.programs.map((program) => ({ value: program.slug, label: program.name })),
      ],
    },
    {
      name: 'dayOfWeek',
      label: 'Day',
      type: 'select',
      required: true,
      options: WEEKDAYS.map((day) => ({ value: String(day.value), label: day.label })),
    },
    { name: 'startTime', label: 'Starts', type: 'time', required: true },
    {
      name: 'endTime',
      label: 'Ends',
      type: 'time',
      required: true,
      validate: endAfterStart('startTime', 'endTime'),
    },
    { name: 'ageRange', label: 'Ages', type: 'text', placeholder: 'Ages 6–12' },
    { name: 'level', label: 'Level', type: 'text', placeholder: 'White Belt' },
    { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
    { name: 'eligibility', label: 'Who can attend', type: 'text' },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'scheduled', label: 'Running as normal' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'changed', label: 'Time changed' },
      ],
      hint: 'Cancellations and changes show a notice on the class.',
    },
    {
      name: 'statusNote',
      label: 'Notice for families',
      type: 'text',
      placeholder: 'Closed for the holiday',
      visibleWhen: (values) => values.status !== 'scheduled',
    },
    {
      name: 'statusDate',
      label: 'Which date this applies to',
      type: 'date',
      hint: 'Leave blank if it applies until you change it back.',
      visibleWhen: (values) => values.status !== 'scheduled',
    },
    {
      name: 'newStartTime',
      label: 'New start time',
      type: 'time',
      visibleWhen: (values) => values.status === 'changed',
      required: true,
    },
    {
      name: 'newEndTime',
      label: 'New end time',
      type: 'time',
      visibleWhen: (values) => values.status === 'changed',
      required: true,
      validate: endAfterStart('newStartTime', 'newEndTime'),
    },
    { name: 'sortOrder', label: 'Order', type: 'number', hint: 'Lower numbers appear first.' },
    publishedField,
  ],
  defaults: () => ({
    className: '',
    programSlug: '',
    dayOfWeek: '1',
    startTime: '',
    endTime: '',
    ageRange: '',
    level: '',
    description: '',
    eligibility: '',
    status: 'scheduled',
    statusNote: '',
    statusDate: '',
    newStartTime: '',
    newEndTime: '',
    sortOrder: 100,
    published: true,
  }),
  toValues: (record) => ({
    className: record.className,
    programSlug: record.programSlug ?? '',
    dayOfWeek: String(record.dayOfWeek),
    startTime: record.startTime,
    endTime: record.endTime,
    ageRange: record.ageRange ?? '',
    level: record.level ?? '',
    description: record.description ?? '',
    eligibility: record.eligibility ?? '',
    status: record.status,
    statusNote: record.statusNote ?? '',
    statusDate: record.statusDate ?? '',
    newStartTime: record.newStartTime ?? '',
    newEndTime: record.newEndTime ?? '',
    sortOrder: record.sortOrder,
    published: record.published,
  }),
  toDraft: (values, existing) => ({
    id: existing?.id,
    className: str(values.className),
    programSlug: optionalStr(values.programSlug),
    dayOfWeek: num(values.dayOfWeek, 1) as Weekday,
    startTime: str(values.startTime),
    endTime: str(values.endTime),
    ageRange: optionalStr(values.ageRange),
    level: optionalStr(values.level),
    description: optionalStr(values.description),
    eligibility: optionalStr(values.eligibility),
    status: str(values.status) as ScheduleEntry['status'],
    statusNote: optionalStr(values.statusNote),
    statusDate: optionalStr(values.statusDate),
    newStartTime: optionalStr(values.newStartTime),
    newEndTime: optionalStr(values.newEndTime),
    published: Boolean(values.published),
    sortOrder: num(values.sortOrder, 100),
  }),
  list: (bundle) => bundle.schedule,
  primaryText: (record) => record.className,
  secondaryText: (record) =>
    `${weekdayLabel(record.dayOfWeek)} · ${formatTimeRange(record.startTime, record.endTime)}${
      record.status === 'cancelled'
        ? ' · Cancelled'
        : record.status === 'changed'
          ? ' · Time changed'
          : ''
    }`,
  save: (repository, draft) => repository.saveScheduleEntry(draft),
  remove: (repository, id) => repository.deleteScheduleEntry(id),
})

/* --------------------------------------------------------------- resources */

const RESOURCE_COLLECTION_LABELS: Record<string, string> = {
  curriculum: 'Curriculum videos',
  binder: 'Binder & documents',
  resources: 'Student resources',
}

const resources = define<LearningResource>({
  key: 'resources',
  title: 'Learning resources',
  singular: 'resource',
  icon: 'book',
  description: 'Curriculum videos, binder documents and student resources.',
  fields: () => [
    { name: 'title', label: 'Title', type: 'text', required: true, wide: true },
    { name: 'description', label: 'Description', type: 'textarea', rows: 4 },
    {
      name: 'collection',
      label: 'Section',
      type: 'select',
      required: true,
      options: RESOURCE_COLLECTIONS.map((value) => ({
        value,
        label: RESOURCE_COLLECTION_LABELS[value],
      })),
    },
    {
      name: 'type',
      label: 'Kind',
      type: 'select',
      required: true,
      options: RESOURCE_TYPES.map((value) => ({
        value,
        label: value === 'video' ? 'Video' : value === 'document' ? 'Document' : 'Web link',
      })),
    },
    { name: 'program', label: 'Program', type: 'text' },
    { name: 'level', label: 'Level', type: 'text' },
    {
      name: 'videoUrl',
      label: 'Video link',
      type: 'url',
      visibleWhen: (values) => values.type === 'video',
      hint: 'YouTube and Vimeo links play inside the app.',
    },
    {
      name: 'documentUrl',
      label: 'Document link',
      type: 'url',
      visibleWhen: (values) => values.type === 'document',
    },
    {
      name: 'externalUrl',
      label: 'Web link',
      type: 'url',
      visibleWhen: (values) => values.type === 'link',
    },
    { name: 'thumbnailUrl', label: 'Thumbnail image', type: 'url' },
    { name: 'sortOrder', label: 'Order', type: 'number' },
    publishedField,
  ],
  defaults: () => ({
    title: '',
    description: '',
    collection: 'curriculum',
    type: 'video',
    program: '',
    level: '',
    videoUrl: '',
    documentUrl: '',
    externalUrl: '',
    thumbnailUrl: '',
    sortOrder: 100,
    published: true,
  }),
  toValues: (record) => ({
    title: record.title,
    description: record.description ?? '',
    collection: record.collection,
    type: record.type,
    program: record.program ?? '',
    level: record.level ?? '',
    videoUrl: record.videoUrl ?? '',
    documentUrl: record.documentUrl ?? '',
    externalUrl: record.externalUrl ?? '',
    thumbnailUrl: record.thumbnailUrl ?? '',
    sortOrder: record.sortOrder,
    published: record.published,
  }),
  toDraft: (values, existing) => ({
    id: existing?.id,
    title: str(values.title),
    description: optionalStr(values.description),
    type: str(values.type) as LearningResource['type'],
    collection: str(values.collection) as LearningResource['collection'],
    program: optionalStr(values.program),
    level: optionalStr(values.level),
    thumbnailUrl: optionalStr(values.thumbnailUrl),
    videoUrl: optionalStr(values.videoUrl),
    documentUrl: optionalStr(values.documentUrl),
    externalUrl: optionalStr(values.externalUrl),
    sortOrder: num(values.sortOrder, 100),
    published: Boolean(values.published),
  }),
  list: (bundle) => bundle.resources,
  primaryText: (record) => record.title,
  secondaryText: (record) =>
    `${RESOURCE_COLLECTION_LABELS[record.collection]}${record.program ? ` · ${record.program}` : ''}`,
  save: (repository, draft) => repository.saveResource(draft),
  remove: (repository, id) => repository.deleteResource(id),
})

/* ---------------------------------------------------------------- programs */

const programs = define<Program>({
  key: 'programs',
  title: 'Programs',
  singular: 'program',
  icon: 'medal',
  description: 'The classes the academy offers.',
  fields: () => [
    { name: 'name', label: 'Program name', type: 'text', required: true },
    {
      name: 'slug',
      label: 'Short key',
      type: 'text',
      required: true,
      hint: 'Lower-case, no spaces. Links classes on the schedule to this program.',
    },
    { name: 'ageRange', label: 'Ages', type: 'text', placeholder: 'Ages 6–12' },
    { name: 'summary', label: 'Short summary', type: 'text', required: true, wide: true },
    { name: 'description', label: 'Full description', type: 'textarea', rows: 6 },
    { name: 'sortOrder', label: 'Order', type: 'number' },
    publishedField,
  ],
  defaults: () => ({
    name: '',
    slug: '',
    ageRange: '',
    summary: '',
    description: '',
    sortOrder: 100,
    published: true,
  }),
  toValues: (record) => ({
    name: record.name,
    slug: record.slug,
    ageRange: record.ageRange ?? '',
    summary: record.summary,
    description: record.description ?? '',
    sortOrder: record.sortOrder,
    published: record.published,
  }),
  toDraft: (values, existing) => ({
    id: existing?.id,
    name: str(values.name),
    slug: slugify(str(values.slug) || str(values.name)),
    ageRange: optionalStr(values.ageRange),
    summary: str(values.summary),
    description: optionalStr(values.description),
    sortOrder: num(values.sortOrder, 100),
    published: Boolean(values.published),
  }),
  list: (bundle) => bundle.programs,
  primaryText: (record) => record.name,
  secondaryText: (record) => [record.ageRange, record.summary].filter(Boolean).join(' · '),
  save: (repository, draft) => repository.saveProgram(draft),
  remove: (repository, id) => repository.deleteProgram(id),
})

/* -------------------------------------------------------------------- FAQs */

const faqs = define<Faq>({
  key: 'faqs',
  title: 'Questions',
  singular: 'question',
  icon: 'info',
  description: 'Answers families look for most often.',
  fields: () => [
    { name: 'question', label: 'Question', type: 'text', required: true, wide: true },
    { name: 'answer', label: 'Answer', type: 'textarea', required: true, rows: 6 },
    { name: 'category', label: 'Group', type: 'text', placeholder: 'New students' },
    { name: 'sortOrder', label: 'Order', type: 'number' },
    publishedField,
  ],
  defaults: () => ({ question: '', answer: '', category: '', sortOrder: 100, published: true }),
  toValues: (record) => ({
    question: record.question,
    answer: record.answer,
    category: record.category ?? '',
    sortOrder: record.sortOrder,
    published: record.published,
  }),
  toDraft: (values, existing) => ({
    id: existing?.id,
    question: str(values.question),
    answer: str(values.answer),
    category: optionalStr(values.category),
    sortOrder: num(values.sortOrder, 100),
    published: Boolean(values.published),
  }),
  list: (bundle) => bundle.faqs,
  primaryText: (record) => record.question,
  secondaryText: (record) => record.category ?? 'General',
  save: (repository, draft) => repository.saveFaq(draft),
  remove: (repository, id) => repository.deleteFaq(id),
})

/* ------------------------------------------------------------------- pages */

const pages = define<Page>({
  key: 'pages',
  title: 'Information pages',
  singular: 'page',
  icon: 'file',
  description: 'About, privacy policy, support and any other written page.',
  fields: () => [
    { name: 'title', label: 'Page title', type: 'text', required: true },
    {
      name: 'slug',
      label: 'Short key',
      type: 'text',
      required: true,
      hint: 'Used in the address. "about", "privacy" and "support" are linked from the More menu.',
    },
    { name: 'body', label: 'Page text', type: 'textarea', required: true, rows: 12 },
    publishedField,
  ],
  defaults: () => ({ title: '', slug: '', body: '', published: true }),
  toValues: (record) => ({
    title: record.title,
    slug: record.slug,
    body: record.body,
    published: record.published,
  }),
  toDraft: (values, existing) => ({
    id: existing?.id,
    title: str(values.title),
    slug: slugify(str(values.slug) || str(values.title)),
    body: str(values.body),
    published: Boolean(values.published),
  }),
  list: (bundle) => bundle.pages,
  primaryText: (record) => record.title,
  secondaryText: (record) => `/${record.slug} · updated ${formatDate(record.updatedAt)}`,
  save: (repository, draft) => repository.savePage(draft),
  remove: (repository, id) => repository.deletePage(id),
})

/* ----------------------------------------------------------------- gallery */

const gallery = define<GalleryItem>({
  key: 'gallery',
  title: 'Photo gallery',
  singular: 'photo',
  icon: 'image',
  description: 'Photos the academy owns and has permission to publish.',
  fields: () => [
    {
      name: 'imageUrl',
      label: 'Image address',
      type: 'url',
      required: true,
      wide: true,
      hint: 'Upload the photo to Supabase Storage (or another host) and paste its address here.',
    },
    { name: 'title', label: 'Title', type: 'text' },
    { name: 'caption', label: 'Caption', type: 'text' },
    {
      name: 'credit',
      label: 'Permission note',
      type: 'text',
      hint: 'Who took the photo and confirmation that the families shown agreed to it.',
    },
    { name: 'sortOrder', label: 'Order', type: 'number' },
    publishedField,
  ],
  defaults: () => ({ imageUrl: '', title: '', caption: '', credit: '', sortOrder: 100, published: true }),
  toValues: (record) => ({
    imageUrl: record.imageUrl,
    title: record.title ?? '',
    caption: record.caption ?? '',
    credit: record.credit ?? '',
    sortOrder: record.sortOrder,
    published: record.published,
  }),
  toDraft: (values, existing) => ({
    id: existing?.id,
    imageUrl: str(values.imageUrl),
    title: optionalStr(values.title),
    caption: optionalStr(values.caption),
    credit: optionalStr(values.credit),
    sortOrder: num(values.sortOrder, 100),
    published: Boolean(values.published),
  }),
  list: (bundle) => bundle.gallery,
  primaryText: (record) => record.title ?? 'Untitled photo',
  secondaryText: (record) => record.caption ?? record.imageUrl,
  save: (repository, draft) => repository.saveGalleryItem(draft),
  remove: (repository, id) => repository.deleteGalleryItem(id),
})

export const COLLECTIONS: CollectionConfig[] = [
  announcements,
  events,
  schedule,
  resources,
  programs,
  faqs,
  pages,
  gallery,
]

export function findCollection(key: string | undefined): CollectionConfig | undefined {
  return COLLECTIONS.find((collection) => collection.key === key)
}

export { SCHEDULE_STATUSES }
