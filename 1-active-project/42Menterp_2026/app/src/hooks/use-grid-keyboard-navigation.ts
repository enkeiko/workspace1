import { useCallback, useRef } from "react";

/**
 * 그리드 좌표
 */
interface GridCoordinate {
  row: number;
  col: number;
}

/**
 * useGridKeyboardNavigation - 그리드 셀 간 키보드 네비게이션을 관리하는 Hook
 *
 * 사용법:
 * ```tsx
 * const { registerCell, moveDown, moveUp, moveNext, ... } = useGridKeyboardNavigation(
 *   stores.length,
 *   products.length
 * );
 *
 * // 셀 렌더링 시
 * <KeyboardInput
 *   ref={(el) => registerCell(rowIndex, colIndex, el)}
 *   onEnter={() => moveNext()}
 *   onArrowDown={() => moveDown()}
 *   ...
 * />
 * ```
 */
export function useGridKeyboardNavigation(rowCount: number, colCount: number) {
  // 셀 참조 저장 (key: "row,col" -> HTMLInputElement)
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // 현재 포커스된 셀 좌표
  const currentCell = useRef<GridCoordinate>({ row: 0, col: 0 });

  /**
   * 셀 키 생성
   */
  const getCellKey = useCallback((row: number, col: number) => `${row},${col}`, []);

  /**
   * 특정 셀로 포커스 이동
   * @returns 성공 여부
   */
  const focusCell = useCallback(
    (row: number, col: number): boolean => {
      // 범위 체크
      if (row < 0 || row >= rowCount || col < 0 || col >= colCount) {
        return false;
      }

      const key = getCellKey(row, col);
      const input = cellRefs.current.get(key);

      if (input) {
        // 현재 위치 업데이트
        currentCell.current = { row, col };

        // 포커스 이동
        input.focus();

        // 스크롤 위치 조정 (필요한 경우)
        input.scrollIntoView({ block: "nearest", inline: "nearest" });

        return true;
      }

      return false;
    },
    [rowCount, colCount, getCellKey]
  );

  /**
   * 아래 셀로 이동
   */
  const moveDown = useCallback(() => {
    const { row, col } = currentCell.current;
    return focusCell(row + 1, col);
  }, [focusCell]);

  /**
   * 위 셀로 이동
   */
  const moveUp = useCallback(() => {
    const { row, col } = currentCell.current;
    return focusCell(row - 1, col);
  }, [focusCell]);

  /**
   * 왼쪽 셀로 이동
   */
  const moveLeft = useCallback(() => {
    const { row, col } = currentCell.current;
    return focusCell(row, col - 1);
  }, [focusCell]);

  /**
   * 오른쪽 셀로 이동
   */
  const moveRight = useCallback(() => {
    const { row, col } = currentCell.current;
    return focusCell(row, col + 1);
  }, [focusCell]);

  /**
   * 다음 셀로 이동 (Enter 키)
   * - 행 끝이 아니면 오른쪽으로
   * - 행 끝이면 다음 행 첫 열로
   */
  const moveNext = useCallback(() => {
    const { row, col } = currentCell.current;

    // 행 끝이 아니면 오른쪽으로
    if (col < colCount - 1) {
      return focusCell(row, col + 1);
    }
    // 행 끝이면 다음 행 첫 열로
    if (row < rowCount - 1) {
      return focusCell(row + 1, 0);
    }
    // 마지막 셀이면 아무것도 하지 않음
    return false;
  }, [rowCount, colCount, focusCell]);

  /**
   * 이전 셀로 이동 (Shift+Enter 키)
   * - 행 시작이 아니면 왼쪽으로
   * - 행 시작이면 이전 행 마지막 열로
   */
  const movePrevious = useCallback(() => {
    const { row, col } = currentCell.current;

    // 행 시작이 아니면 왼쪽으로
    if (col > 0) {
      return focusCell(row, col - 1);
    }
    // 행 시작이면 이전 행 마지막 열로
    if (row > 0) {
      return focusCell(row - 1, colCount - 1);
    }
    // 첫 번째 셀이면 아무것도 하지 않음
    return false;
  }, [rowCount, colCount, focusCell]);

  /**
   * 셀 등록/해제
   * 컴포넌트 ref 콜백으로 사용
   */
  const registerCell = useCallback(
    (row: number, col: number, ref: HTMLInputElement | null) => {
      const key = getCellKey(row, col);
      if (ref) {
        cellRefs.current.set(key, ref);

        // 포커스 이벤트 리스너 추가 (현재 위치 추적)
        ref.addEventListener("focus", () => {
          currentCell.current = { row, col };
        });
      } else {
        cellRefs.current.delete(key);
      }
    },
    [getCellKey]
  );

  /**
   * 첫 번째 셀로 포커스
   */
  const focusFirstCell = useCallback(() => {
    return focusCell(0, 0);
  }, [focusCell]);

  /**
   * 마지막 셀로 포커스
   */
  const focusLastCell = useCallback(() => {
    return focusCell(rowCount - 1, colCount - 1);
  }, [rowCount, colCount, focusCell]);

  /**
   * 특정 행의 첫 번째 셀로 포커스
   */
  const focusRowStart = useCallback(
    (row: number) => {
      return focusCell(row, 0);
    },
    [focusCell]
  );

  /**
   * 특정 행의 마지막 셀로 포커스
   */
  const focusRowEnd = useCallback(
    (row: number) => {
      return focusCell(row, colCount - 1);
    },
    [colCount, focusCell]
  );

  /**
   * 현재 포커스된 셀 좌표 반환
   */
  const getCurrentPosition = useCallback(() => {
    return { ...currentCell.current };
  }, []);

  /**
   * 모든 셀 참조 초기화
   */
  const clearAllRefs = useCallback(() => {
    cellRefs.current.clear();
    currentCell.current = { row: 0, col: 0 };
  }, []);

  return {
    // 셀 등록
    registerCell,

    // 이동
    moveDown,
    moveUp,
    moveLeft,
    moveRight,
    moveNext,
    movePrevious,

    // 포커스
    focusCell,
    focusFirstCell,
    focusLastCell,
    focusRowStart,
    focusRowEnd,

    // 상태
    getCurrentPosition,
    clearAllRefs,
  };
}
