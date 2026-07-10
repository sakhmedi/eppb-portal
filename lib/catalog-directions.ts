// Направления поддержки холдинга «Байтерек» — витрина на главной и навигация в каталог.
// Это фиксированный справочник: он задаёт, какие направления показываем и как называется
// категория, по которой каталог фильтрует услуги (поле services.category).
//
// Важно: `category` должна ДОСЛОВНО совпадать со значением, которое проставлено услугам в БД
// (см. миграцию 20260710120000_recategorize_services.sql), иначе фильтр по направлению
// не найдёт услуги.

import {
  Banknote,
  Truck,
  ShieldCheck,
  Percent,
  Umbrella,
  Globe,
  type LucideIcon,
} from "lucide-react";

export interface SupportDirection {
  /** Технический ключ (для React key и т.п.). */
  key: string;
  /** Название направления — оно же метка для каталога. */
  label: string;
  /** Короткое пояснение, что это за поддержка. */
  description: string;
  /** Значение services.category, по которому фильтруется каталог. */
  category: string;
  /** Иконка направления (lucide). */
  icon: LucideIcon;
}

export const SUPPORT_DIRECTIONS: SupportDirection[] = [
  {
    key: "crediting",
    label: "Кредитование",
    description: "Льготные кредиты и займы для бизнеса на развитие и оборотные средства.",
    category: "Кредитование",
    icon: Banknote,
  },
  {
    key: "leasing",
    label: "Лизинг",
    description: "Финансовый лизинг оборудования, техники и транспорта.",
    category: "Лизинг",
    icon: Truck,
  },
  {
    key: "guarantee",
    label: "Гарантирование",
    description: "Гарантии по кредитам при нехватке залогового обеспечения.",
    category: "Гарантирование",
    icon: ShieldCheck,
  },
  {
    key: "subsidy",
    label: "Субсидирование",
    description: "Субсидирование процентной ставки и части затрат по проектам.",
    category: "Субсидирование",
    icon: Percent,
  },
  {
    key: "insurance",
    label: "Страхование",
    description: "Страховая защита экспортных и предпринимательских рисков.",
    category: "Страхование",
    icon: Umbrella,
  },
  {
    key: "export",
    label: "Поддержка экспорта",
    description: "Помощь в выходе на внешние рынки и продвижении казахстанских товаров.",
    category: "Поддержка экспорта",
    icon: Globe,
  },
];
