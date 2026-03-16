import { describe, it, expect } from 'vitest';
import { buildDegreesOfFreedomSpec, ENHANCEMENT_CONFIGS } from '../../utils/constants';

describe('buildDegreesOfFreedomSpec', () => {
  it('returns OPT_OUT for all keys when no enhancements enabled', () => {
    const result = buildDegreesOfFreedomSpec({}, 'image');
    const spec = result.creative_features_spec;

    expect(spec.standard_enhancements_catalog.enroll_status).toBe('OPT_OUT');
    expect(spec.product_metadata_automation.enroll_status).toBe('OPT_OUT');
    expect(spec.text_overlay_translation.enroll_status).toBe('OPT_OUT');
  });

  it('opts in umbrella key when any child enhancement is enabled', () => {
    const enhancements = { image: { visual_touchups: true } };
    const result = buildDegreesOfFreedomSpec(enhancements, 'image');
    const spec = result.creative_features_spec;

    expect(spec.standard_enhancements_catalog.enroll_status).toBe('OPT_IN');
  });

  it('handles translate_text mapping correctly', () => {
    const enhancements = { video: { translate_text: true } };
    const result = buildDegreesOfFreedomSpec(enhancements, 'video');
    const spec = result.creative_features_spec;

    expect(spec.text_overlay_translation.enroll_status).toBe('OPT_IN');
  });

  it('works for carousel type', () => {
    const result = buildDegreesOfFreedomSpec({}, 'carousel');
    expect(result.creative_features_spec).toBeDefined();
    expect(Object.keys(result.creative_features_spec).length).toBe(5);
  });

  it('falls back to image config for unknown type', () => {
    const result = buildDegreesOfFreedomSpec({}, 'unknown');
    expect(result.creative_features_spec).toBeDefined();
  });
});
