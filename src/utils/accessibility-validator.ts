/**
 * Accessibility Validation Suite
 * WCAG 2.1 AA Compliance Testing and Reporting
 */

interface AccessibilityIssue {
  type: 'error' | 'warning' | 'success'
  rule: string
  message: string
  element?: string
  suggestion?: string
}

interface AccessibilityReport {
  score: number
  issues: AccessibilityIssue[]
  summary: {
    errors: number
    warnings: number
    successes: number
  }
  recommendations: string[]
}

export class AccessibilityValidator {
  private issues: AccessibilityIssue[] = []

  // Check color contrast ratios
  checkColorContrast(element: HTMLElement): boolean {
    const styles = window.getComputedStyle(element)
    const color = this.parseColor(styles.color)
    const backgroundColor = this.parseColor(styles.backgroundColor)
    
    if (!color || !backgroundColor) return true
    
    const contrastRatio = this.calculateContrastRatio(color, backgroundColor)
    const fontSize = parseFloat(styles.fontSize)
    const fontWeight = parseInt(styles.fontWeight)
    
    // Determine if text is "large" (18pt+ or 14pt+ bold)
    const isLargeText = fontSize >= 24 || (fontSize >= 18 && fontWeight >= 700)
    const requiredRatio = isLargeText ? 3.0 : 4.5
    
    if (contrastRatio < requiredRatio) {
      this.issues.push({
        type: 'error',
        rule: 'WCAG 2.1 AA 1.4.3',
        message: `Color contrast ratio (${contrastRatio.toFixed(2)}) is below required ${requiredRatio} for ${isLargeText ? 'large' : 'normal'} text`,
        element: element.tagName.toLowerCase(),
        suggestion: `Increase contrast by adjusting colors or adding background elements`
      })
      return false
    }
    
    return true
  }

  // Check for missing alt attributes on images
  checkImageAltText(images: NodeListOf<HTMLImageElement>): void {
    images.forEach(img => {
      if (!img.alt) {
        if (img.getAttribute('aria-hidden') === 'true') {
          this.issues.push({
            type: 'success',
            rule: 'WCAG 2.1 AA 1.1.1',
            message: 'Decorative image correctly has no alt text',
            element: img.tagName.toLowerCase()
          })
        } else {
          this.issues.push({
            type: 'error',
            rule: 'WCAG 2.1 AA 1.1.1',
            message: 'Image missing alt attribute',
            element: img.tagName.toLowerCase(),
            suggestion: 'Add descriptive alt text or aria-hidden="true" for decorative images'
          })
        }
      } else {
        this.issues.push({
          type: 'success',
          rule: 'WCAG 2.1 AA 1.1.1',
          message: 'Image has alt text',
          element: img.tagName.toLowerCase()
        })
      }
    })
  }

  // Check form labels
  checkFormLabels(forms: NodeListOf<HTMLFormElement>): void {
    forms.forEach(form => {
      const inputs = form.querySelectorAll('input, select, textarea')
      inputs.forEach(input => {
        const label = form.querySelector(`label[for="${input.id}"]`) || 
                     input.closest('label') ||
                     input.getAttribute('aria-label')
        
        if (!label && (input as HTMLInputElement).type !== 'hidden') {
          this.issues.push({
            type: 'error',
            rule: 'WCAG 2.1 AA 1.3.1',
            message: 'Form field missing label',
            element: input.tagName.toLowerCase(),
            suggestion: 'Add a label element or aria-label attribute'
          })
        } else {
          this.issues.push({
            type: 'success',
            rule: 'WCAG 2.1 AA 1.3.1',
            message: 'Form field has proper labeling',
            element: input.tagName.toLowerCase()
          })
        }
      })
    })
  }

  // Check focus indicators
  checkFocusIndicators(elements: NodeListOf<HTMLElement>): void {
    elements.forEach(element => {
      const styles = window.getComputedStyle(element, ':focus')
      const outline = styles.outline
      const boxShadow = styles.boxShadow
      
      const hasFocusIndicator = outline !== 'none' || boxShadow.includes('0px')
      
      if (!hasFocusIndicator && element.tabIndex >= 0) {
        this.issues.push({
          type: 'warning',
          rule: 'WCAG 2.1 AA 2.4.7',
          message: 'Interactive element may have insufficient focus indicator',
          element: element.tagName.toLowerCase(),
          suggestion: 'Add visible focus styles using :focus or :focus-visible'
        })
      }
    })
  }

  // Check touch target sizes
  checkTouchTargets(elements: NodeListOf<HTMLElement>): void {
    elements.forEach(element => {
      const rect = element.getBoundingClientRect()
      const minSize = 44 // WCAG AA minimum
      
      if (rect.width < minSize || rect.height < minSize) {
        this.issues.push({
          type: 'warning',
          rule: 'WCAG 2.1 AA 2.5.5',
          message: `Touch target size (${Math.round(rect.width)}x${Math.round(rect.height)}px) below minimum ${minSize}px`,
          element: element.tagName.toLowerCase(),
          suggestion: 'Increase touch target size to at least 44x44px'
        })
      }
    })
  }

  // Check heading structure
  checkHeadingStructure(headings: NodeListOf<HTMLHeadingElement>): void {
    let previousLevel = 0
    const headingLevels: number[] = []
    
    headings.forEach(heading => {
      const level = parseInt(heading.tagName.charAt(1))
      headingLevels.push(level)
      
      if (level > previousLevel + 1) {
        this.issues.push({
          type: 'error',
          rule: 'WCAG 2.1 AA 1.3.1',
          message: `Heading level jumps from h${previousLevel} to h${level}`,
          element: heading.tagName.toLowerCase(),
          suggestion: 'Use sequential heading levels (h1, h2, h3, etc.)'
        })
      }
      previousLevel = level
    })
    
    if (headingLevels.length > 0) {
      this.issues.push({
        type: 'success',
        rule: 'WCAG 2.1 AA 1.3.1',
        message: 'Document has proper heading structure',
        element: 'document'
      })
    }
  }

  // Check ARIA attributes
  checkARIAUsage(elements: NodeListOf<Element>): void {
    elements.forEach(element => {
      const ariaLabel = element.getAttribute('aria-label')
      const ariaLabelledBy = element.getAttribute('aria-labelledby')
      const role = element.getAttribute('role')
      
      // Check for proper ARIA usage
      if (role && !this.isValidRole(role)) {
        this.issues.push({
          type: 'error',
          rule: 'WCAG 2.1 AA 4.1.2',
          message: `Invalid ARIA role: ${role}`,
          element: element.tagName.toLowerCase(),
          suggestion: 'Use valid ARIA roles from the specification'
        })
      }
      
      if (ariaLabel && ariaLabel.trim().length === 0) {
        this.issues.push({
          type: 'warning',
          rule: 'WCAG 2.1 AA 4.1.2',
          message: 'Empty aria-label attribute',
          element: element.tagName.toLowerCase(),
          suggestion: 'Remove empty aria-label or provide descriptive text'
        })
      }
    })
  }

  // Validate keyboard navigation
  checkKeyboardNavigation(interactiveElements: NodeListOf<HTMLElement>): void {
    const tabbableElements = Array.from(interactiveElements)
      .filter(el => this.isTabbable(el))
      .sort((a, b) => a.tabIndex - b.tabIndex)
    
    // Check if any interactive elements are not keyboard accessible
    interactiveElements.forEach(element => {
      if (!this.isTabbable(element)) {
        this.issues.push({
          type: 'error',
          rule: 'WCAG 2.1 AA 2.1.1',
          message: 'Interactive element not keyboard accessible',
          element: element.tagName.toLowerCase(),
          suggestion: 'Add tabindex="0" or make element naturally focusable'
        })
      }
    })
  }

  // Generate accessibility report
  generateReport(): AccessibilityReport {
    const totalChecks = this.issues.length
    const errors = this.issues.filter(issue => issue.type === 'error').length
    const warnings = this.issues.filter(issue => issue.type === 'warning').length
    const successes = this.issues.filter(issue => issue.type === 'success').length
    
    // Calculate score (0-100)
    const score = totalChecks > 0 
      ? Math.round(((successes + warnings * 0.5) / totalChecks) * 100)
      : 100
    
    const recommendations = this.generateRecommendations()
    
    return {
      score,
      issues: this.issues,
      summary: { errors, warnings, successes },
      recommendations
    }
  }

  // Helper methods
  private parseColor(color: string): number[] | null {
    if (color.startsWith('#')) {
      const hex = color.slice(1)
      if (hex.length === 3) {
        return [
          parseInt(hex[0] + hex[0], 16),
          parseInt(hex[1] + hex[1], 16),
          parseInt(hex[2] + hex[2], 16)
        ]
      } else if (hex.length === 6) {
        return [
          parseInt(hex.slice(0, 2), 16),
          parseInt(hex.slice(2, 4), 16),
          parseInt(hex.slice(4, 6), 16)
        ]
      }
    } else if (color.startsWith('rgb')) {
      const matches = color.match(/\d+/g)
      if (matches && matches.length >= 3) {
        return matches.slice(0, 3).map(Number)
      }
    }
    return null
  }

  private calculateContrastRatio(color1: number[], color2: number[]): number {
    const getLuminance = (rgb: number[]): number => {
      return rgb.map(value => {
        const sRGB = value / 255
        return sRGB <= 0.03928 
          ? sRGB / 12.92 
          : Math.pow((sRGB + 0.055) / 1.055, 2.4)
      }).reduce((acc, val, i) => acc + val * [0.2126, 0.7152, 0.0722][i], 0)
    }
    
    const lum1 = getLuminance(color1)
    const lum2 = getLuminance(color2)
    const brightest = Math.max(lum1, lum2)
    const darkest = Math.min(lum1, lum2)
    
    return (brightest + 0.05) / (darkest + 0.05)
  }

  private isValidRole(role: string): boolean {
    const validRoles = [
      'alert', 'alertdialog', 'application', 'article', 'banner', 'button', 'cell',
      'checkbox', 'columnheader', 'combobox', 'complementary', 'contentinfo',
      'definition', 'dialog', 'directory', 'document', 'feed', 'figure', 'form',
      'grid', 'gridcell', 'group', 'heading', 'img', 'link', 'list', 'listbox',
      'listitem', 'log', 'main', 'marquee', 'math', 'menu', 'menubar', 'menuitem',
      'meter', 'navigation', 'none', 'note', 'option', 'presentation', 'progressbar',
      'radio', 'radiogroup', 'region', 'row', 'rowgroup', 'rowheader', 'scrollbar',
      'search', 'searchbox', 'separator', 'slider', 'spinbutton', 'status', 'switch',
      'tab', 'table', 'tablist', 'tabpanel', 'term', 'textbox', 'timer', 'toolbar',
      'tooltip', 'tree', 'treegrid', 'treeitem'
    ]
    return validRoles.includes(role)
  }

  private isTabbable(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase()
    const type = element.getAttribute('type')
    const disabled = element.hasAttribute('disabled')
    const hidden = element.hasAttribute('hidden')
    const tabindex = element.getAttribute('tabindex')
    
    if (hidden || disabled) return false
    
    // Elements that are naturally focusable
    const focusableTags = ['a', 'button', 'input', 'select', 'textarea', 'summary']
    if (focusableTags.includes(tagName)) {
      if (tagName === 'a' && !element.hasAttribute('href')) return false
      return true
    }
    
    // Check tabindex
    if (tabindex !== null) {
      const index = parseInt(tabindex)
      return index >= 0
    }
    
    return false
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = []
    const errors = this.issues.filter(issue => issue.type === 'error')
    
    if (errors.some(issue => issue.rule.includes('1.1.1'))) {
      recommendations.push('Add descriptive alt text to all images')
    }
    
    if (errors.some(issue => issue.rule.includes('1.4.3'))) {
      recommendations.push('Improve color contrast ratios to meet WCAG AA standards')
    }
    
    if (errors.some(issue => issue.rule.includes('2.1.1'))) {
      recommendations.push('Ensure all interactive elements are keyboard accessible')
    }
    
    if (errors.some(issue => issue.rule.includes('2.4.7'))) {
      recommendations.push('Add visible focus indicators to interactive elements')
    }
    
    if (errors.some(issue => issue.rule.includes('1.3.1'))) {
      recommendations.push('Implement proper heading structure and form labeling')
    }
    
    return recommendations
  }
}

// Convenience function to run accessibility audit
export function runAccessibilityAudit(): AccessibilityReport {
  const validator = new AccessibilityValidator()
  
  // Run all checks
  validator.checkImageAltText(document.querySelectorAll('img'))
  validator.checkFormLabels(document.querySelectorAll('form'))
  validator.checkFocusIndicators(document.querySelectorAll('button, a, input, select, textarea'))
  validator.checkTouchTargets(document.querySelectorAll('button, a, [role="button"]'))
  validator.checkHeadingStructure(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
  validator.checkARIAUsage(document.querySelectorAll('[role], [aria-label], [aria-labelledby]'))
  validator.checkKeyboardNavigation(document.querySelectorAll('button, a, input, select, textarea, [role="button"], [tabindex]'))
  
  // Check color contrast for key elements
  document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div').forEach(element => {
    validator.checkColorContrast(element as HTMLElement)
  })
  
  return validator.generateReport()
}