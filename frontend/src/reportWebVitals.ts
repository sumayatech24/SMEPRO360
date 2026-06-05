const reportWebVitals = (onPerfEntry?: any) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then((vitals: any) => {
      const fn = (name: string) => vitals[name] || vitals['on' + name.charAt(0).toUpperCase() + name.slice(1)];
      ['getCLS','getFID','getFCP','getLCP','getTTFB'].forEach(name => {
        const f = fn(name); if (f) f(onPerfEntry);
      });
    });
  }
};

export default reportWebVitals;
