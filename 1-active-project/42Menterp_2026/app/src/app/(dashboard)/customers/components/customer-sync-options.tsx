"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export type SyncOptions = {
  syncBusinessNo: boolean;
  syncRepresentative: boolean;
  syncAddress: boolean;
  syncContactPhone: boolean;
  applyToAllStores: boolean;
  targetStoreIds: string[];
};

type StoreOption = {
  id: string;
  name: string;
};

interface CustomerSyncOptionsProps {
  stores: StoreOption[];
  value: SyncOptions;
  onChange: (value: SyncOptions) => void;
}

export function CustomerSyncOptions({
  stores,
  value,
  onChange,
}: CustomerSyncOptionsProps) {
  const toggleField = (key: keyof SyncOptions) => {
    onChange({ ...value, [key]: !value[key] });
  };

  const handleStoreToggle = (storeId: string) => {
    const next = value.targetStoreIds.includes(storeId)
      ? value.targetStoreIds.filter((id) => id !== storeId)
      : [...value.targetStoreIds, storeId];
    onChange({ ...value, targetStoreIds: next });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">동기화 대상 필드</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={value.syncBusinessNo}
              onCheckedChange={() => toggleField("syncBusinessNo")}
            />
            사업자번호
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={value.syncRepresentative}
              onCheckedChange={() => toggleField("syncRepresentative")}
            />
            대표자
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={value.syncAddress}
              onCheckedChange={() => toggleField("syncAddress")}
            />
            주소
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={value.syncContactPhone}
              onCheckedChange={() => toggleField("syncContactPhone")}
            />
            연락처
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">동기화 대상 매장</Label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={value.applyToAllStores}
            onCheckedChange={() =>
              onChange({
                ...value,
                applyToAllStores: !value.applyToAllStores,
                targetStoreIds: [],
              })
            }
          />
          연결된 매장 전체 적용
        </label>
        {!value.applyToAllStores && (
          <div className="grid gap-2 sm:grid-cols-2">
            {stores.map((store) => (
              <label key={store.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={value.targetStoreIds.includes(store.id)}
                  onCheckedChange={() => handleStoreToggle(store.id)}
                />
                {store.name}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
