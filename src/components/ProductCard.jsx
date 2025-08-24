import React from 'react'

export default function ProductCard({ product }) {
  const { name, price, sku, description, image } = product
  return (
    <article className="card">
      {image && <img loading="lazy" src={image} alt={name} />}
      <div className="card-body">
        <h3>{name}</h3>
        <p className="sku">SKU: {sku}</p>
        <p className="desc">{description}</p>
        <p className="price">S/ {price.toFixed(2)}</p>
      </div>
    </article>
  )
}
