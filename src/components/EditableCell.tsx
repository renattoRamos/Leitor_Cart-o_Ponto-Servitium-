import React, { useState, useEffect, useRef } from 'react';

/**
 * Aplica a máscara dinâmica "##:##" (ou "+##:##" / "-##:##")
 * automaticamente enquanto o usuário digita na célula de horário.
 */
function applyDynamicTimeMask(input: string, prevValue: string, isSaldo: boolean = false): string {
  // Preserva sinal opcional (+ ou -) no início (ex.: para saldo)
  let sign = '';
  let rest = input;
  if (rest.startsWith('+') || rest.startsWith('-')) {
    sign = rest[0];
    rest = rest.slice(1);
  }

  // Se o usuário digitou apenas o sinal (+ ou -)
  if (rest === '' && sign !== '') {
    return sign;
  }

  // Detecta se é ação de apagar (backspace/delete)
  const isDeleting =
    input.length < prevValue.length &&
    (prevValue.startsWith(input) || prevValue.startsWith(input.slice(0, Math.max(0, input.length - 1))));

  // Filtra apenas dígitos numéricos
  const digits = rest.replace(/\D/g, '');

  if (isDeleting) {
    if (input.endsWith(':')) {
      return `${sign}${digits.slice(0, 2)}:`;
    }
    if (digits.length <= 2) {
      return `${sign}${digits}`;
    }
    return `${sign}${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
  }

  // Ao digitar ou colar caracteres:
  if (digits.length === 0) {
    return sign;
  }
  if (digits.length === 1) {
    // Se o usuário digitou 1 número e apertou dois pontos ":" (ex.: "8:") -> "08:"
    if (input.includes(':')) {
      return `${sign}0${digits}:`;
    }
    return `${sign}${digits}`;
  }
  if (digits.length === 2) {
    // Ao atingir 2 dígitos, adiciona automaticamente os dois pontos "##:"
    return `${sign}${digits}:`;
  }
  if (digits.length === 3) {
    return `${sign}${digits.slice(0, 2)}:${digits.slice(2, 3)}`;
  }
  if (!isSaldo || digits.length <= 4) {
    // Formato padrão "##:##"
    return `${sign}${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
  }

  // Suporte a horas estendidas em saldo (ex.: 111:19)
  const hourLen = Math.min(3, digits.length - 2);
  return `${sign}${digits.slice(0, hourLen)}:${digits.slice(hourLen, hourLen + 2)}`;
}

interface EditableCellProps {
  value: string | null | undefined;
  rawDisplayValue: string;
  fieldKey: string;
  rowIdx: number;
  editingCell: { rowIdx: number; fieldKey: string } | null;
  onStartEdit: (rowIdx: number, fieldKey: string, initialVal: string) => void;
  onCommit: (newVal: string) => void;
  onCancel: () => void;
  className: string;
  align?: 'center' | 'right' | 'left';
  isTime?: boolean;
  isModified?: boolean;
  readOnly?: boolean;
}

export const EditableCell: React.FC<EditableCellProps> = ({
  value,
  rawDisplayValue,
  fieldKey,
  rowIdx,
  editingCell,
  onStartEdit,
  onCommit,
  onCancel,
  className,
  align = 'center',
  isTime = true,
  isModified = false,
  readOnly = false,
}) => {
  const isEditing = !readOnly && editingCell?.rowIdx === rowIdx && editingCell?.fieldKey === fieldKey;
  const [localVal, setLocalVal] = useState<string>(value || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setLocalVal(value || '');
    }
  }, [isEditing, value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    onCommit(localVal);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onCommit(localVal);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (isTime) {
      const masked = applyDynamicTimeMask(raw, localVal, fieldKey === 'saldo');
      setLocalVal(masked);
    } else {
      setLocalVal(raw);
    }
  };

  if (readOnly) {
    return (
      <td className={`${className} select-none`}>
        <div
          className={`min-h-[19px] flex items-center ${
            align === 'right' ? 'justify-end' : align === 'left' ? 'justify-start' : 'justify-center'
          } w-full`}
        >
          <span>{rawDisplayValue}</span>
        </div>
      </td>
    );
  }

  if (isEditing) {
    return (
      <td className={`${className} p-0.5 relative bg-white`}>
        {/* Triângulo sutil no canto superior direito para célula modificada */}
        {isModified && (
          <span
            className="absolute top-0 right-0 w-0 h-0 border-solid border-t-[6px] border-t-amber-500 border-l-[6px] border-l-transparent z-20 pointer-events-none print:hidden"
            title="Valor alterado manualmente"
          />
        )}
        <input
          ref={inputRef}
          type="text"
          value={localVal}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          maxLength={isTime ? (fieldKey === 'saldo' ? 7 : 5) : undefined}
          className={`w-full h-5.5 px-1 text-[10.5px] font-mono bg-white text-slate-900 border-2 border-emerald-500 rounded-xs outline-hidden shadow-xs focus:ring-1 focus:ring-emerald-400 ${
            align === 'right' ? 'text-right' : align === 'left' ? 'text-left font-sans' : 'text-center'
          }`}
          placeholder={isTime ? '00:00' : '...'}
        />
      </td>
    );
  }

  return (
    <td
      onDoubleClick={() => onStartEdit(rowIdx, fieldKey, value || '')}
      title={isModified ? 'Valor alterado manualmente (Duplo clique para editar)' : 'Duplo clique para alterar ou adicionar valor'}
      className={`${className} relative cursor-pointer hover:bg-emerald-50/70 hover:text-emerald-950 transition-colors select-none group/cell`}
    >
      {/* Triângulo sutil no canto superior direito indicando edição manual */}
      {isModified && (
        <span
          className="absolute top-0 right-0 w-0 h-0 border-solid border-t-[6px] border-t-amber-500 border-l-[6px] border-l-transparent z-10 pointer-events-none print:hidden"
          title="Valor alterado manualmente"
        />
      )}
      <div
        className={`min-h-[19px] flex items-center ${
          align === 'right' ? 'justify-end' : align === 'left' ? 'justify-start' : 'justify-center'
        } w-full`}
      >
        {rawDisplayValue ? (
          <span className={isModified ? 'font-semibold text-slate-900' : ''}>{rawDisplayValue}</span>
        ) : (
          <span className="opacity-0 group-hover/cell:opacity-40 text-[9px] text-slate-400 font-sans">+</span>
        )}
      </div>
    </td>
  );
};
