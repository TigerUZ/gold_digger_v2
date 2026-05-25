import "./PageBackground.css";

function PageBackground({
  image,
  children,
  className = "",
  blur = false,
  overlay = true,
  overlayOpacity = 0.2,
}) {
  const rootClass = ["page-background", className].filter(Boolean).join(" ");
  const imageClass = ["page-background__image", blur ? "page-background__image--blur" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass}>
      <div className={imageClass} style={{ backgroundImage: `url("${image}")` }} />
      {overlay ? (
        <div
          className={
            "page-background__overlay" + (blur ? " page-background__overlay--vignette" : "")
          }
          style={
            blur ? undefined : { background: `rgba(0, 0, 0, ${overlayOpacity})` }
          }
        />
      ) : null}
      <div className="page-background__content">{children}</div>
    </div>
  );
}

export default PageBackground;
