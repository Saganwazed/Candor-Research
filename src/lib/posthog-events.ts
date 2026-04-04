/**
 * PostHog Event Tracking
 * Centralized event definitions and helpers for analytics
 */

import { usePostHog } from 'posthog-js/react'

export function useAnalyticsEvents() {
  const posthog = usePostHog()

  return {
    /**
     * Track article analysis
     */
    trackAnalysis: (mode: 'url' | 'text', biasDirection?: string) => {
      posthog.capture('article_analyzed', {
        mode,
        bias_direction: biasDirection,
      })
    },

    /**
     * Track analysis errors
     */
    trackAnalysisError: (mode: 'url' | 'text', errorMessage: string) => {
      posthog.capture('analysis_error', {
        mode,
        error_message: errorMessage,
      })
    },

    /**
     * Track article fetch errors (URL mode)
     */
    trackFetchError: (errorMessage: string) => {
      posthog.capture('fetch_error', {
        error_message: errorMessage,
      })
    },

    /**
     * Track report sharing
     */
    trackShareCreated: (biasDirection?: string) => {
      posthog.capture('report_shared', {
        bias_direction: biasDirection,
      })
    },

    /**
     * Track share visibility toggle
     */
    trackShareVisibilityToggled: (isPublic: boolean) => {
      posthog.capture('share_visibility_toggled', {
        is_public: isPublic,
      })
    },

    /**
     * Track shared report view
     */
    trackSharedReportViewed: () => {
      posthog.capture('shared_report_viewed')
    },

    /**
     * Track feedback submission
     */
    trackFeedbackSubmitted: (feedback: string) => {
      posthog.capture('feedback_submitted', {
        feedback_length: feedback.length,
      })
    },

    /**
     * Track input mode switch
     */
    trackModeSwitch: (newMode: 'url' | 'text') => {
      posthog.capture('input_mode_switched', {
        new_mode: newMode,
      })
    },

    /**
     * Track theme toggle
     */
    trackThemeToggled: (isDark: boolean) => {
      posthog.capture('theme_toggled', {
        is_dark: isDark,
      })
    },

    /**
     * Track extension banner interaction
     */
    trackExtensionBannerClicked: () => {
      posthog.capture('extension_banner_clicked')
    },
  }
}
