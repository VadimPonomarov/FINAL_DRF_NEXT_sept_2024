export interface IItem {
  id?: number;
  value?: string;
  label?: string;
  isSeparator?: boolean;
}

export interface IProps {
  items: IItem[];
  onSelect?: (id: number) => void;
  label?: string;
}

export type IComboBoxItem = IItem;
