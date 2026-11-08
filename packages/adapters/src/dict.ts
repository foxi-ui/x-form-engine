/**
 * 字典类组件的 Snapshot 冻结参考实现。
 * 对应 `verification/06` §6：冻结 label 与字典版本，缺失选项不伪造 label。
 */

export interface DictOption {
  label: string;
  value: string | number;
}

export interface DictSnapshot {
  value: string | number;
  label: string | null;
  dictCode: string;
  dictVersion?: string;
  missing?: true;
}

export function createDictSnapshot(
  value: string | number,
  options: DictOption[],
  dictCode: string,
  dictVersion?: string
): DictSnapshot {
  const matched = options.find((option) => option.value === value);
  return {
    value,
    label: matched?.label ?? null,
    dictCode,
    ...(dictVersion ? { dictVersion } : {}),
    ...(matched ? {} : { missing: true as const }),
  };
}
