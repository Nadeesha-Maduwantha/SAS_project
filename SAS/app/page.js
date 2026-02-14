export default function Home() {
  return (
    <main>
        <h1 align="center" >Dart Global Logistics</h1>
      <form action="Homejs" method="post" align="center">
              <label for="email">email</label>
              <input type="email" id="email" name="email" required /><br/>
              <label for="password">password</label>
              <input type="password" id="password" name="password" required /><br/>
              <button type="submit">Submit</button>
          </form>
    </main>
  );
}
