import styles from './Logo.module.css';

/**
 * Wataniya Zawaya logo, rebuilt from the Figma vector parts (brackets, dot, Latin wordmark).
 * Always rendered left-to-right so it never mirrors in RTL.
 */
export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <div className={`${styles.logo} ${styles[size]}`} dir="ltr" role="img" aria-label="زوايا الوطنية · Wataniya Zawaya">
      <svg className={styles.mark} viewBox="0 0 26.5 24.5" aria-hidden="true">
        <path
          fill="var(--red-500)"
          d="M1.615 18.445L1.275 18.4733L1.21833 18.445L1.20417 18.3883L0.0141667 6.99833L0 6.545L0.0141667 6.035L0.0708333 5.58167L0.184167 5.12833L0.354167 4.61833L0.566667 4.165L0.8075 3.76833L1.16167 3.315L1.38833 3.06L1.72833 2.73417L1.955 2.56417L2.57833 2.1675L3.08833 1.94083L3.37167 1.84167L3.825 1.7L4.10833 1.6575L19.975 0L20.0033 0.0283333L20.0458 0.425L20.4425 4.27833L20.4567 4.505L20.4283 4.53333L5.865 6.06333L5.58167 6.13417L5.29833 6.2475L5.12833 6.34667L4.90167 6.57333L4.77417 6.77167L4.70333 6.99833L4.64667 7.33833L4.66083 7.735L5.70917 17.7083L5.72333 17.9917L5.695 18.02L1.615 18.445Z"
        />
        <path
          fill="var(--logo-ink)"
          transform="translate(6 6)"
          d="M0.835833 18.445L0.495833 18.4875L0.4675 18.445L0.0283333 14.3083L0 14.025L0.0141667 13.9683L0.0425 13.94L14.2092 12.4525L14.6625 12.3958L14.8892 12.3392L15.1725 12.2258L15.3708 12.0983L15.5833 11.8717L15.7108 11.645L15.7675 11.475L15.81 11.135V10.795L14.7617 0.878333L14.7333 0.481667L14.7758 0.453333L18.9692 0.0141667L19.1958 0L19.2383 0.0283333L20.4 11.0217L20.4708 11.985L20.4567 12.4383L20.4 12.835L20.2867 13.345L20.1308 13.7983L19.89 14.3083L19.72 14.5917L19.4508 14.9883L19.0825 15.4133L18.5725 15.8525L18.3458 16.0225L17.8925 16.3058L17.4958 16.49L17.0425 16.66L16.3058 16.8158L0.835833 18.445Z"
        />
        <circle cx="13" cy="12.4" r="2.27" fill="var(--red-500)" />
      </svg>
      <span className={styles.words}>
        <span className={styles.arabic} lang="ar" dir="rtl">
          <span>زوايا</span>
          <span className={styles.red}>الوطنية</span>
        </span>
        <span className={styles.latin}>WATANIYA ZAWAYA</span>
      </span>
    </div>
  );
}
