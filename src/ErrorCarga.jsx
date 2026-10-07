import Icono from './Iconos'

// Aviso cuando no se pudieron traer los datos (por ejemplo, sin internet)
export default function ErrorCarga({ onReintentar }) {
  return (
    <section className="pz-card pz-error-carga" role="alert">
      <span className="pz-error-carga-ico"><Icono nombre="nube" size={26} /></span>
      <b>No pudimos cargar tus datos</b>
      <span>Revisá tu conexión a internet y probá de nuevo. Tus datos están guardados, no se perdió nada.</span>
      <button type="button" className="pz-btn pz-btn-primario" onClick={onReintentar}>Reintentar</button>
    </section>
  )
}