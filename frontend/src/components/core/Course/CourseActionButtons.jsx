import React from 'react';
import { FaShoppingCart } from 'react-icons/fa';
import { SpinnerCircular } from 'spinners-react'; // lightweight spinner, ensure installed

/**
 * Reusable action button block for course cards and detail pages.
 * Handles:
 *   - Price display
 *   - "Add to Cart" (secondary) button with cart icon
 *   - "Buy Now" / "Enroll" primary button with gradient styling
 *   - Loading states for each action
 *   - Responsive layout (horizontal on md+, stacked on mobile)
 *   - Hides buttons when the user is already enrolled (shows optional custom child)
 */
export default function CourseActionButtons({
  price,
  isFree,
  isEnrolled,
  onBuy,
  onAddToCart,
  buyLoading = false,
  addLoading = false,
  enrolledRender = null,
  disableAddToCart = false,
}) {
  const primaryLabel = isEnrolled ? 'Go To Classroom' : isFree ? 'Start Learning Free' : 'Buy Now';
  const secondaryLabel = 'Add To Cart';

  return (
    <div className="flex flex-col md:flex-row gap-3 w-full items-stretch">
      {/* Price */}
      <div className="flex items-center justify-center md:justify-start text-2xl font-semibold text-white">
        ₹ {price}
      </div>
      {/* Buttons container */}
      <div className="flex flex-col md:flex-row gap-3 flex-1 justify-end">
        {isEnrolled && enrolledRender ? (
          enrolledRender
        ) : (
          <>
            {/* Primary CTA */}
            <button
              onClick={onBuy}
              disabled={buyLoading}
              className={`relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm uppercase tracking-widest shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500`}
            >
              {buyLoading ? (
                <SpinnerCircular size={20} color="#ffffff" thickness={100} />
              ) : (
                <>{primaryLabel}</>
              )}
            </button>
            {/* Secondary Add‑to‑Cart */}
            {!disableAddToCart && (
              <button
                onClick={onAddToCart}
                disabled={addLoading}
                className={`relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm uppercase tracking-widest shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                  border border-white/20 bg-transparent text-white hover:bg-white/10`}
              >
                {addLoading ? (
                  <SpinnerCircular size={20} color="#ffffff" thickness={100} />
                ) : (
                  <>
                    <FaShoppingCart className="text-base" />
                    {secondaryLabel}
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
