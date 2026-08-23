# Light mode vs. dark mode: research review (2020-2026)

Focused on web application usability, not just article-based reading contexts.

---

## 1. Why people choose light vs. dark mode

### Adoption statistics

- **82% of smartphone users** employ dark mode (Earthweb, 2024)
- **81.9% of Android users** use dark mode regularly (LinkedIn survey, n=2,500)
- **92% of software engineers** prefer dark mode for development environments (Zipdo, 2020)
- NNg's more controlled survey of 115 mobile users found a roughly **even three-way split**: ~1/3 dark, ~1/3 light, ~1/3 switch between both
- **82.7% switch to dark mode after 10 p.m.**
- **64.6% expect websites to automatically switch** to dark mode based on system settings

### Motivations

- **Reduced eye strain** (perceived, though evidence is mixed; refer to Section 4)
- **Aesthetic preference** — dark mode is perceived as more modern and visually appealing
- **Battery conservation** on OLED devices
- **Blue light concerns** and circadian rhythm disruption at night
- **Context-dependent switching**: users reserve dark mode for evening/entertainment use, light mode for focused work during the day

### Psychological factors

- Users regard dark mode as a **system-level setting**, not an application feature: they expect all apps to follow their OS preference (NNg, 2023)
- Dark mode users showed **minimal frustration** when encountering light-mode-only apps (NNg, 2023)
- A study found that when awake for longer periods, **dark UI users were more honest** than light UI users; no general difference in honesty otherwise (Koning & Junger, 2021)

### Sources

- [Dark Mode: How Users Think About It and Issues to Avoid — NNg](https://www.nngroup.com/articles/dark-mode-users-issues/) (Kohler & Zhang, 2023)
- [35+ Dark Mode Statistics You Need to Know (2026)](https://forms.app/en/blog/dark-mode-statistics)
- [Dark Mode Usage Statistics: Market Data Report 2026](https://gitnux.org/dark-mode-usage-statistics/)
- [Dark user interface, dark behavior? The effect of 'dark mode' on honesty](https://www.sciencedirect.com/science/article/pii/S2451958821000555) (Koning & Junger, _Computers in Human Behavior Reports_, Vol. 4, 2021)

---

## 2. Screen type, display fidelity, and color mode

### OLED vs. LCD battery impact

The **Purdue University study (2021)**, presented at ACM MobiSys 2021, tested six popular Google Play apps across Pixel 2, Moto Z3, Pixel 4, and Pixel 5 devices:

- At **100% brightness**: dark mode saves **39-47% battery** on OLED displays
- At **50% brightness**: savings drop to approximately **3-9%**
- At **30% brightness**: average savings only **14%**
- On **LCD panels**: dark mode saves only **3-7%** regardless of brightness
- Key finding: light mode at 20% brightness on OLED draws the **same power** as dark mode at 50% brightness

### Display-specific visual effects

- A **2023 UC Berkeley ophthalmology study** found participants using dark-mode LCD tablets reported **22% more headache frequency** and slower reading comprehension vs. matched OLED users under identical ambient lighting
- On OLED displays, dark mode produces **true black** (pixels off), providing higher contrast ratios
- On LCD displays, "black" areas still produce some backlight bleed, reducing the contrast advantage of dark mode

### High-DPI considerations

- The positive polarity advantage (favoring light mode) is **most pronounced at small character sizes** (Piepenbrock et al., 2014), which has implications for high-DPI displays rendering small UI elements
- Anti-aliasing renders differently in dark vs. light modes: **dark mode creates halo effects** around text edges that are more noticeable on lower-DPI displays

### Sources

- [Dark mode may not save your phone's battery life as much as you think — Purdue University](https://www.purdue.edu/newsroom/archive/releases/2021/Q3/dark-mode-may-not-save-your-phones-battery-life-as-much-as-you-think,-but-there-are-a-few-silver-linings.html) (2021)
- [How much battery does dark mode save? An accurate OLED display power profiler](https://www.researchgate.net/publication/352713407_How_much_battery_does_dark_mode_save_an_accurate_OLED_display_power_profiler_for_modern_smartphones) (ResearchGate)
- [Positive Display Polarity Is Particularly Advantageous for Small Character Sizes](https://journals.sagepub.com/doi/abs/10.1177/0018720813515509) (Piepenbrock et al., _Human Factors_, 2014)

---

## 3. Web application-specific research

### Terra case study (web.dev, 2021)

Terra, one of Brazil's largest media companies (75M monthly users), implemented a custom dark theme:

- **Desktop (Windows)**: bounce rate dropped **60%** (27.5% to 10.82%); pages per session increased **170%** (3.7 to 9.99)
- **Mobile (Android)**: pages per session nearly doubled (2.47 to 5.24); bounce rate improved from 26.91% to 23.91%
- Methodology: prompted dark-mode-preferring users (detected via `prefers-color-scheme`) with a "Night Mode" option

### Dashboard-specific research (ACM ETRA 2025)

An eye-tracking study by Ettling, Steinmann, Bektas, and Abbad-Andaloussi examined dark vs. light themes for **dashboard decision-making tasks**:

- Dark mode **improved accuracy, confidence, and average fixation count** for medium-complexity tasks
- In dark mode, **relative pupil dilation was higher** but **perceived workload was lower** than in light mode
- Results suggest dark mode may benefit specific dashboard interaction scenarios

### App implementation study (ACM IMWUT 2024)

Andrew, Bishop, and Tigwell inspected 120 popular Android and iOS apps:

- Only **55% of Android apps** and **48% of iOS apps** supported any mode switching
- Significant variability in how many UI elements changed between modes
- Interviews with 15 designers/developers revealed challenges in alternative mode implementation

### A/B testing results

- Pages offering **theme toggles** or defaulting to system preference see a **14% lower bounce rate** on average
- One web design agency found sites offering dark themes saw a **43% increase in user engagement**
- Results are **highly context-dependent**: no universal winner across all app types

### Data visualization in dark mode

- Dark backgrounds help **colorful data visualizations stand out**, providing more immediate visual hierarchy
- Simplified color palettes work best: too many colors overwhelm in dark mode
- Semi-bold/medium font weights recommended over ultra-thin fonts that fade against dark backgrounds
- Salesforce and Expedia Group have tested chart and graph readability across light and dark backgrounds

### Sources

- [How Terra improved user engagement thanks to Dark Mode — web.dev](https://web.dev/case-studies/terra-dark-mode) (Bandarra, Renzulli, Moser de Souza, 2021)
- [An Eye Tracking Study on the Effects of Dark and Light Themes on User Performance and Workload](https://dl.acm.org/doi/10.1145/3715669.3725879) (Ettling et al., ACM ETRA 2025)
- [Light and Dark Mode: A Comparison Between Android and iOS App UI Modes](https://dl.acm.org/doi/10.1145/3643539) (Andrew, Bishop, Tigwell, _Proc. ACM IMWUT_, Vol. 8, Issue 1, 2024)
- [Dark Mode vs. Light Mode: Insights from A/B Testing User Preferences](https://mondaysys.com/dark-mode-vs-light-mode-insights-from-a-b-testing-user-preferences/)
- [Dark Mode in Data Visualisation — Expedia Group](https://careers.expediagroup.com/blog/dark-mode-in-data-visualisation-should-we-turn-the-lights-out/)

---

## 4. Readability and cognitive performance

### The positive polarity advantage

The strongest and most replicated finding in this domain: **dark text on light background (positive polarity) produces better reading performance than light text on dark background (negative polarity)** for users with normal vision.

**Piepenbrock et al. (2013)** — _Ergonomics_:

- Positive polarity advantage found for **both younger and older adults** in visual acuity and proofreading tasks
- The advantage increases with decreasing character size

**Piepenbrock et al. (2014)** — _Ergonomics_:

- Mechanism identified: positive polarity displays cause **smaller pupil sizes**, producing a sharper retinal image
- Better proofreading performance correlated with smaller pupil size
- The advantage **linearly increases with decreasing character size**

### Cognitive performance study (2025)

Gazit & Tager-Shafrir, "The dark side of the interface" — _Ergonomics_, March 2025:

- 173 participants from diverse regions; online cognitive tests
- **Cognitive scores higher in light mode** compared to dark mode
- **Younger adults outperformed older adults** in light mode
- **Males outperformed females** in both modes
- Participants with academic education performed better in dark mode than those without
- Females preferred light mode; males comfortable with both

### Reading speed and error rates

- **Dobres et al. (2017)** — _Applied Ergonomics_ (MIT AgeLab): Under nighttime conditions, light mode outperformed dark mode, especially with small font sizes. Daytime conditions showed no significant difference.
- Text-dominant workflows in dark mode: **character recognition errors increase 14-22%** and **sustained reading speed decreases 8.3%** (industry analysis)
- A 2020 **Oslo Metropolitan University** study found **no difference in performance** between dark and light mode, challenging productivity claims

### Developer/code editor context

- 2/3 of surveyed developers prefer dark mode in code editors
- Syntax highlighting colors appear **more vivid** against dark backgrounds
- However, research suggests this preference is based more on **comfort/aesthetic** than measurable productivity gains

### Sources

- [Positive display polarity is advantageous for both younger and older adults](https://pubmed.ncbi.nlm.nih.gov/23654206/) (Piepenbrock et al., _Ergonomics_, 2013)
- [Smaller pupil size and better proofreading performance with positive than with negative polarity displays](https://pubmed.ncbi.nlm.nih.gov/25135324/) (Piepenbrock et al., _Ergonomics_, 2014)
- [The dark side of the interface: examining the influence of different background modes on cognitive performance](https://www.tandfonline.com/doi/full/10.1080/00140139.2025.2483451) (Gazit & Tager-Shafrir, _Ergonomics_, 2025)
- [Dark Mode vs. Light Mode: Which Is Better? — NNg](https://www.nngroup.com/articles/dark-mode/) (Budiu, 2020, updated 2024)
- [Is Dark Mode Better Than Light Mode for Coding? — Built In](https://builtin.com/software-engineering-perspectives/dark-mode)

---

## 5. Accessibility considerations

### Astigmatism and halation

- Approximately **50% of the population** has some degree of astigmatism
- White text on dark backgrounds creates a **"halation" effect**: text appears fuzzy/blurred
- Astigmatism causes light to focus unevenly; the **dilated pupil in dark mode exacerbates** this effect
- A UK study of 11,000+ eyeglass wearers showed **47.4% had astigmatism of 0.75D or greater**

### Low vision users

- **Cloudy ocular media (cataracts)**: All 7 participants with this condition in a study had **better reading rates in dark mode** (Legge et al.)
- **Impaired central vision**: Not affected by contrast polarity
- **Photosensitivity/photophobia**: Dark mode provides relief, especially in dim environments
- Important: **dark mode and high-contrast mode are not the same**. High contrast uses pure black with limited colors; dark mode uses shades of gray

### Dyslexia

- Reading comprehension difficulties can **increase** in dark mode for some people with dyslexia

### Keyboard navigation

- Focus indicators often become **poorly visible** in dark mode implementations
- White focus rings on dark areas can disappear if not properly designed

### WCAG compliance

- **WCAG 2.1 SC 1.4.3** requires minimum **4.5:1 contrast ratio** for normal text, **3:1 for large text**; this applies regardless of theme
- **WCAG Level AAA** requires **7:1 for normal text**, **4.5:1 for large text**
- Offering dark mode does **not** satisfy WCAG contrast requirements if the default theme fails them
- Pure black (#000000) + pure white (#FFFFFF) creates **excessive contrast** that causes eye strain; **dark gray (#121212)** is recommended

### Design guidelines from major companies

**Google Material Design:**

- Recommends **#121212** as dark theme surface color
- High-emphasis text at **87% opacity**, medium at **60%**, disabled at **38%**
- Minimum **15.8:1 contrast** between text and background

**Apple Human Interface Guidelines:**

- Dark Mode is "a systemwide appearance setting"
- Use system-defined semantic colors (label, secondaryLabel, systemBackground) that **adapt automatically**

**Microsoft Inclusive Design:**

- Built to support **light, dark, and high contrast** modes
- Co-designed with disabled and neurodivergent users

### Sources

- [Dark mode & accessibility myth debunked — Stephanie Walter](https://stephaniewalter.design/blog/dark-mode-accessibility-myth-debunked/)
- [Light Mode VS Dark Mode For Low Vision — Veroniiiica](https://veroniiiica.com/dark-mode-for-low-vision/)
- [Light mode vs Dark Mode for low vision — Perkins School for the Blind](https://www.perkins.org/resource/dark-or-white-choosing-dark-mode-for-low-vision/)
- [Astigmatism and Web Accessibility — Level Access](https://www.levelaccess.com/blog/accessibility-for-people-with-astigmatism/)
- [Dark Mode Can Improve Text Readability — But Not for Everyone — BOIA](https://www.boia.org/blog/dark-mode-can-improve-text-readability-but-not-for-everyone)
- [Offering a Dark Mode Doesn't Satisfy WCAG Color Contrast Requirements — BOIA](https://www.boia.org/blog/offering-a-dark-mode-doesnt-satisfy-wcag-color-contrast-requirements)
- [Inclusive Dark Mode: Designing Accessible Dark Themes — Smashing Magazine](https://www.smashingmagazine.com/2025/04/inclusive-dark-mode-designing-accessible-dark-themes/) (April 2025)
- [Dark Mode — Apple Developer Documentation](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
- [Material Design Dark Theme — Google](https://design.google/library/material-design-dark-theme)
- [Understanding Success Criterion 1.4.3: Contrast (Minimum) — W3C](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)

---

## 6. Environmental and contextual factors

### Ambient lighting

A **2024 study** in the _International Journal of Human-Computer Interaction_ (36 participants, two ambient illumination levels, two color modes, three color temperatures) found:

- At **450 lux** (office lighting): lower visual fatigue in dark mode with 4500K and 6500K color temperatures
- At **3 lux** (dark environment): lower visual fatigue in dark mode with 4500K color temperature
- **2800K color temperature** caused the highest fatigue in both modes and both lighting conditions

### Text color under dark mode

A **2024 study** in _Sensors_ (PMC) on negative polarity and ambient illumination:

- Text color significantly affects visual fatigue under dark mode
- Fatigue ranking: **red > green > blue > white > yellow** (yellow is least fatiguing)
- Increasing ambient lighting reduces visual fatigue in dark mode, but improvement varies by text color

### Blue light and circadian rhythm

- Blue light **suppresses melatonin for twice as long** as green light and shifts circadian rhythms by twice as much (3 hours vs. 1.5 hours) (Harvard Health)
- iPRGCs containing melanopsin are activated by ~480nm blue light
- Dark mode reduces (but does not eliminate) blue light emission
- Recommendation: avoid bright screens **2-3 hours before bed** (Harvard Health)

### Myopia concerns

- **Aleman et al. (2018)** in _Scientific Reports_: Sustained exposure to light mode may be associated with myopia through choroid membrane thinning
- This creates a tension: light mode is better for reading performance but may carry long-term eye health risks

### Time of day effects

- Users overwhelmingly switch to dark mode in the evening: **82.7% switch after 10 p.m.**
- MIT AgeLab (Dobres et al., 2017): nighttime conditions showed **light mode still outperformed dark mode** for task performance, particularly at small font sizes
- But **perceived comfort** favors dark mode at night, even if measured performance does not

### Extended use

- A 2025 tablet study found **no statistically significant difference** in overall visual fatigue between modes, but found significant differences in **critical flicker frequency and dry eye symptoms**
- Dark mode's fatigue advantage was "best when the entire virtual environment was dimly lit" but "the advantage over a dimly lit light mode was still very small" (NNg summary)

### Sources

- [Effects of Screen Color Mode and Color Temperature on Visual Fatigue under Different Ambient Illuminations](https://www.tandfonline.com/doi/abs/10.1080/10447318.2024.2305982) (_Int. J. Human-Computer Interaction_, Vol. 41, No. 2, 2024)
- [The Effect of Ambient Illumination and Text Color on Visual Fatigue under Negative Polarity](https://pmc.ncbi.nlm.nih.gov/articles/PMC11175232/) (_Sensors_, 2024)
- [Immediate Effects of Light Mode and Dark Mode Features on Visual Fatigue in Tablet Users](https://pmc.ncbi.nlm.nih.gov/articles/PMC12027292/) (PMC, 2025)
- [Blue light has a dark side — Harvard Health](https://www.health.harvard.edu/staying-healthy/blue-light-has-a-dark-side)
- [Dark vs. Light Mode on Smartphones: Effects on Eye Fatigue](https://personales.upv.es/thinkmind/dl/conferences/achi/achi_2024/achi_2024_3_150_20069.pdf) (ACHI 2024)

---

## 7. Systematic reviews

### Systematic review using S-O-R framework (2024)

Yang, Goh, and Yi published "The Research into Dark Mode: A Systematic Review Using Two-Stage Approach and S-O-R Framework" in the _International Journal of Computational and Experimental Science and Engineering_ (Vol. 11, Issue 2). Analyzed **143,386 articles from 1992-2022** from Scopus, proposing a comprehensive research framework.

### Sources

- [The Research into Dark Mode: A Systematic Review](https://www.ijcesen.com/index.php/ijcesen/article/view/1415) (Yang, Goh, Yi, _IJCESEN_, 2024)
- [Dark Mode vs Light Mode: Impact on UX and Visual Comfort in Mobile Applications](https://www.researchgate.net/publication/400786807_Dark_Mode_vs_Light_Mode_Impact_on_User_Experience_and_Visual_Comfort_in_Mobile_Applications)
- [An Exploration of Effects of Dark Mode on University Students](https://arxiv.org/pdf/2409.10895) (arXiv, 2024)

---

## Key takeaways

1. **Light mode generally produces better measurable performance** (reading speed, proofreading accuracy, cognitive scores) for users with normal vision, due to the positive polarity advantage and smaller pupil size.
2. **Dark mode benefits specific populations**: users with cataracts/cloudy ocular media, photosensitivity, and those in genuinely low-light environments.
3. **Dark mode harms other populations**: approximately 50% of people have some astigmatism, for whom dark mode creates halation effects that blur text.
4. **User preference strongly favors dark mode** (70-82% in surveys), but preference does not align with measured performance: a classic perception-vs-reality gap.
5. **Context matters enormously**: ambient lighting, display type (OLED vs. LCD), task type (reading vs. dashboards vs. creative work), font size, and time of day all modulate the effect.
6. **For web applications, offering both modes with a toggle is the recommended approach**, defaulting to system preference via `prefers-color-scheme`. NNg, W3C/WCAG, Apple, Google, and Microsoft guidelines all support this.
7. **Battery savings from dark mode on OLED are real but overstated** at typical brightness levels (3-9% at normal indoor brightness).
8. **For dashboards and data visualization specifically**, dark mode can help colorful charts stand out, and the ETRA 2025 eye-tracking study found dark mode improved accuracy for medium-complexity dashboard tasks.
