"use client";

import { Refrigerator, X } from "lucide-react";
import { useEffect } from "react";
import type { UserIngredient } from "@/lib/types";
import { IngredientManager } from "./IngredientManager";

export function IngredientDrawer({
  ingredients,
  setIngredients,
  isOpen,
  onToggle,
  onClose
}: {
  ingredients: UserIngredient[];
  setIngredients: (ingredients: UserIngredient[]) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="fixed bottom-5 right-5 z-[70] inline-flex items-center gap-2 rounded-full bg-carrot-600 px-4 py-3 text-sm font-black text-white shadow-soft ring-1 ring-carrot-300 transition hover:bg-carrot-700 focus:outline-none focus:ring-2 focus:ring-carrot-300 focus:ring-offset-2 sm:bottom-6 sm:right-6"
        aria-expanded={isOpen}
        aria-controls="ingredient-drawer"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
          <Refrigerator aria-hidden className="h-4 w-4" />
        </span>
        <span>재료함</span>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-carrot-700">{ingredients.length}</span>
      </button>

      <div
        className={`fixed inset-0 z-40 transition ${isOpen ? "visible pointer-events-auto" : "invisible pointer-events-none delay-300"}`}
        aria-hidden={!isOpen}
      >
        <button
          type="button"
          className={`absolute inset-0 h-full w-full bg-stone-950/24 transition-opacity ${isOpen ? "opacity-100" : "opacity-0"}`}
          onClick={onClose}
          aria-label="재료함 닫기"
          tabIndex={isOpen ? 0 : -1}
        />

        <aside
          id="ingredient-drawer"
          className={`absolute right-0 top-0 flex h-dvh w-full max-w-[460px] flex-col bg-white shadow-2xl ring-1 ring-stone-200 transition-transform duration-300 ease-out sm:w-[min(460px,calc(100vw-2rem))] ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
          aria-label="내 재료함"
          aria-modal="true"
          role="dialog"
        >
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-stone-100 bg-white px-5 py-4">
            <div className="min-w-0">
              <p className="text-xs font-black text-carrot-700">내가 가진 재료</p>
              <p className="mt-0.5 text-sm font-semibold text-stone-500">총 {ingredients.length}개 보유 중</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500 transition hover:bg-stone-200 hover:text-stone-900"
              aria-label="재료함 닫기"
            >
              <X aria-hidden className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-stone-50/70 px-4 pb-28 pt-4">
            <IngredientManager ingredients={ingredients} setIngredients={setIngredients} />
          </div>
        </aside>
      </div>
    </>
  );
}
